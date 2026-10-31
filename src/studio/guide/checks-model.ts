import type { Check, Project, Text } from '../../project/generated/types.ts';
import type { LessonRun } from '../../project/guided/record.ts';

export interface CheckRow {
  testId: string;
  checkId: string;
  label: string;
  kind: string;
  /** A `code` check matches text; it does not prove the code is used. */
  textCheck: boolean;
  hidden: boolean;
  state: 'notRun' | 'pass' | 'fail';
  /** The verdict needs an analog solve the current tier does not run. */
  unavailable: boolean;
}

const localized = (text: Text, locale: string): string => (typeof text === 'string' ? text : (text[locale] ?? text.en));

/** One row per check of every test, in the project's order. A hidden check keeps its state but none of its text. */
export function checkRows(project: Project, run: LessonRun | null, locale: string): CheckRow[] {
  const verdicts = new Map<string, { ok: boolean; detail?: string }>();
  for (const t of run?.tests ?? []) {
    for (const v of t.verdicts) verdicts.set(`${v.testId}/${v.checkId}`, v);
  }
  return project.tests.flatMap((test) =>
    test.checks.map((check: Check): CheckRow => {
      const verdict = verdicts.get(`${test.id}/${check.id}`);
      const hidden = check.visibility === 'hidden';
      return {
        testId: test.id,
        checkId: check.id,
        label: hidden ? '' : localized(check.label, locale),
        kind: check.kind,
        textCheck: check.kind === 'code',
        hidden,
        state: verdict === undefined ? 'notRun' : verdict.ok ? 'pass' : 'fail',
        unavailable: verdict?.detail === 'needs-analog',
      };
    }),
  );
}

export function summary(rows: CheckRow[]): { passed: number; total: number; hidden: number; hiddenPassed: number } {
  const hidden = rows.filter((r) => r.hidden);
  return {
    passed: rows.filter((r) => r.state === 'pass').length,
    total: rows.length,
    hidden: hidden.length,
    hiddenPassed: hidden.filter((r) => r.state === 'pass').length,
  };
}

/** The first three hints are levels 1 to 3. Any more stay in level 3, one paragraph each. */
export function hintLevels(hints: Text[], locale: string): { level: number; text: string }[] {
  const texts = hints.map((h) => localized(h, locale));
  const levels = texts.slice(0, 2).map((text, i) => ({ level: i + 1, text }));
  const rest = texts.slice(2);
  return rest.length === 0 ? levels : [...levels, { level: 3, text: rest.join('\n\n') }];
}
