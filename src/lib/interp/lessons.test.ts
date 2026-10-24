// @vitest-environment node
// Every lesson and practice task in src/content through the app's one check path
// (runHeadless + evaluateChecks): the reference must pass every check and the starter must not.
// A board lesson's reference is its code with the default chips; its starter is an empty program.
// A practice task's reference is its solution; its starter is the task's starter code.
// SIMLAB_LESSON_TABLE=<path> writes the results as a Markdown table.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { BoardContent, Check, Language, PracticeTask, RoboticsContent } from '@/content/schema';
import { boardLoaders, roboticsLoaders } from '@/content/index.generated';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, lessonVariant, runChecks, taskJob, type CheckJob, type CheckResult } from '@/lib/interp';

const root = process.cwd();

function prose(lab: 'boards' | 'robotics', id: string): (key: string) => string {
  const file = join(root, 'src/i18n/content/en', lab, `${id}.json`);
  const json: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return (key) => {
    const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), json);
    return typeof v === 'string' ? v : key;
  };
}

const EMPTY: Record<Language, string> = {
  'arduino-cpp': 'void setup() {\n}\n\nvoid loop() {\n}\n',
  micropython: 'pass\n',
  python: 'pass\n',
  verilog: 'module top();\nendmodule\n',
};

interface Row {
  item: string;
  id: string;
  variant: string;
  reference: CheckResult[];
  referenceError: string | null;
  starter: CheckResult[];
  checks: Check[];
  ms: number;
}

const rows: Row[] = [];

function run(job: CheckJob) {
  const t0 = performance.now();
  const outcome = runChecks(job);
  return { ...outcome, ms: performance.now() - t0 };
}

const boards = Object.entries(boardLoaders) as [string, () => Promise<{ default: BoardContent }>][];
const benches = Object.entries(roboticsLoaders) as [string, () => Promise<{ default: RoboticsContent }>][];

describe('every lesson through runHeadless + evaluateChecks', async () => {
  for (const [id, load] of boards) {
    const board = (await load()).default;
    const text = prose('boards', id);
    for (const lesson of board.lessons) {
      it(`${id} / ${lesson.id}`, () => {
        const reference = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
        const ref = run(lessonJob(board, lesson, reference));
        const starter = run(lessonJob(board, lesson, EMPTY[lesson.language]));
        rows.push({ item: id, id: lesson.id, variant: lessonVariant(board, lesson) ?? '', reference: ref.results, referenceError: ref.trace.error?.message ?? null, starter: starter.results, checks: lesson.checks, ms: ref.ms });
        const failed = lesson.checks.map((ch, i) => (ref.results[i].ok ? null : `${ch.kind} ${JSON.stringify(ch)} ${ref.results[i].detail ?? ''}`)).filter(Boolean);
        expect(ref.trace.error, ref.trace.serial.slice(0, 6).map((l) => l.text).join('\n')).toBeNull();
        expect(failed, ref.trace.serial.slice(0, 6).map((l) => l.text).join('\n')).toEqual([]);
        expect(starter.results.every((r) => r.ok), 'the empty program must fail at least one check').toBe(false);
      }, 60_000);
    }
  }
  for (const [id, load] of benches) {
    const bench = (await load()).default;
    const text = prose('robotics', id);
    for (const task of bench.tasks as PracticeTask[]) {
      it(`${id} / ${task.id}`, () => {
        const ref = run(taskJob(task, task.solution));
        const starter = run(taskJob(task, resolveText(task.starter.source, text)));
        rows.push({ item: id, id: task.id, variant: '', reference: ref.results, referenceError: ref.trace.error?.message ?? null, starter: starter.results, checks: task.checks, ms: ref.ms });
        const failed = task.checks.map((ch, i) => (ref.results[i].ok ? null : `${ch.kind} ${JSON.stringify(ch)} ${ref.results[i].detail ?? ''}`)).filter(Boolean);
        expect(ref.trace.error, ref.trace.serial.slice(0, 6).map((l) => l.text).join('\n')).toBeNull();
        expect(failed, ref.trace.serial.slice(0, 6).map((l) => l.text).join('\n')).toEqual([]);
        expect(starter.results.every((r) => r.ok), 'the starter must fail at least one check').toBe(false);
      }, 60_000);
    }
  }
});

afterAll(() => {
  const out = process.env.SIMLAB_LESSON_TABLE;
  if (!out) return;
  const pass = (r: CheckResult[]) => r.length > 0 && r.every((x) => x.ok);
  const lines = rows
    .sort((a, b) => a.item.localeCompare(b.item))
    .map((r) => {
      const refOk = pass(r.reference) && !r.referenceError;
      const failing = r.reference.map((x, i) => (x.ok ? null : r.checks[i].kind)).filter(Boolean).join(', ');
      return `| ${r.item} | ${r.id} | ${r.variant || '–'} | ${refOk ? 'pass' : `**fail** (${r.referenceError ?? failing})`} | ${pass(r.starter) ? '**passes**' : 'fails'} | ${r.reference.filter((x) => x.ok).length}/${r.checks.length} | ${(r.ms / 1000).toFixed(1)} s |`;
    });
  const refPass = rows.filter((r) => pass(r.reference) && !r.referenceError).length;
  const starterFail = rows.filter((r) => !pass(r.starter)).length;
  const header = [
    '# Phase 1: every lesson and task through the app check path',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)} by \`SIMLAB_LESSON_TABLE=docs/verify/phase1-lessons.md npx vitest run src/lib/interp/lessons.test.ts\`.`,
    'Each row runs `runChecks` (runHeadless + evaluateChecks, the same code the Board Lab and Robotics workers run) on the',
    "reference code and on the starter (board lessons have no starter, so the empty program stands in). Variant is the lesson's first variant.",
    '',
    `Reference passes: ${refPass}/${rows.length}. Starter fails: ${starterFail}/${rows.length}.`,
    '',
  ];
  writeFileSync(out, [...header, '| Item | Lesson / task | Variant | Reference | Starter | Checks (ref) | Run time |', '|---|---|---|---|---|---|---|', ...lines, ''].join('\n'));
});
