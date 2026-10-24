// @vitest-environment node
// Every lesson and practice task in src/content through the app's one check path
// (runHeadless + evaluateChecks): the reference must pass every check and the starter must not.
// A board lesson's reference is its code with the default chips; its starter is an empty program.
// A practice task's reference is its solution; its starter is the task's starter code.
// SIMLAB_LESSON_TABLE=<path> writes the results as a Markdown table.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { BoardContent, Check, Language, Lesson, PracticeTask, RoboticsContent, WorldModel } from '@/content/schema';
import { boardLoaders, roboticsLoaders } from '@/content/index.generated';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { evaluateChecks, getProfile, pinoutNets, runHeadless, type BoardId, type CheckResult } from '@/lib/interp';

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

interface Case {
  board: string;
  variant: string | null;
  language: Language;
  world: WorldModel;
  runMs: number;
  checks: Check[];
  logicV?: number;
  nets?: Record<number, string>;
  ports?: Record<string, string[]>;
}

function run(c: Case, source: string) {
  const t0 = performance.now();
  const trace = runHeadless({ board: c.board, variant: c.variant, language: c.language, source, world: c.world, runMs: c.runMs, logicV: c.logicV, nets: c.nets, ports: c.ports });
  const results = evaluateChecks(c.checks, trace, { source, board: c.board, variant: c.variant, nets: c.nets });
  return { trace, results, ms: performance.now() - t0 };
}

function lessonVariant(board: BoardContent, lesson: Lesson): string | null {
  if (lesson.variants.length) return lesson.variants[0];
  return board.variants[0]?.id ?? null;
}

function boardNets(board: BoardContent): Record<number, string> | undefined {
  try {
    return pinoutNets(getProfile(board.id as BoardId), board.pinout);
  } catch {
    return undefined;
  }
}

const boards = Object.entries(boardLoaders) as [string, () => Promise<{ default: BoardContent }>][];
const benches = Object.entries(roboticsLoaders) as [string, () => Promise<{ default: RoboticsContent }>][];

describe('every lesson through runHeadless + evaluateChecks', async () => {
  for (const [id, load] of boards) {
    const board = (await load()).default;
    const text = prose('boards', id);
    for (const lesson of board.lessons) {
      const c: Case = { board: id, variant: lessonVariant(board, lesson), language: lesson.language, world: lesson.world, runMs: lesson.runMs, checks: lesson.checks, logicV: board.logicVolts, nets: boardNets(board), ports: lesson.code.ports };
      it(`${id} / ${lesson.id}`, () => {
        const reference = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
        const ref = run(c, reference);
        const starter = run(c, EMPTY[lesson.language]);
        rows.push({ item: id, id: lesson.id, variant: c.variant ?? '', reference: ref.results, referenceError: ref.trace.error?.message ?? null, starter: starter.results, checks: lesson.checks, ms: ref.ms });
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
      const c: Case = { board: task.board, variant: null, language: task.language, world: task.world, runMs: task.runMs, checks: task.checks };
      it(`${id} / ${task.id}`, () => {
        const ref = run(c, task.solution);
        const starter = run(c, resolveText(task.starter.source, text));
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
  writeFileSync(out, ['| Item | Lesson / task | Variant | Reference | Starter | Checks (ref) | Run time |', '|---|---|---|---|---|---|---|', ...lines, ''].join('\n'));
});
