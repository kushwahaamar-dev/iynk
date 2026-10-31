import type { Check as ProjectCheck, Op, Project, TestCase } from "../project/generated/types.ts";

export type { ProjectCheck };

export const AUTHOR_CHECK_KINDS = ["runs", "serial", "pin-level", "pin-toggles", "pwm", "tone", "servo", "responds", "code"] as const;

export type AuthorCheckKind = (typeof AUTHOR_CHECK_KINDS)[number];

export const DEFAULT_TEST_ID = "my-checks";

export const MAX_CHECKS = 200;
export const MAX_TESTS = 64;
export const MAX_REGEX_LENGTH = 200;

const DEFAULT_TEST_NAME = "My checks";
const DEFAULT_AT_MS = 1000;

/** What the editor knows about the board a check reads. The UI wiring builds it from the interpreter profile. */
export interface BoardPins {
  /** The interpreter's board id. */
  id: string;
  /** The document's board id (`brd_*`); set when the project has more than one board. */
  boardRef?: string;
  resolve(pin: string): number | undefined;
  /** The silkscreen names the pin picker offers. */
  names: string[];
  defaultPin: string;
}

export interface CheckIssue {
  field: string;
  key: string;
  args?: Record<string, string | number>;
}

type AuthorCheck = Extract<ProjectCheck, { kind: AuthorCheckKind }>;

export const isAuthorCheck = (c: ProjectCheck): c is AuthorCheck => (AUTHOR_CHECK_KINDS as readonly string[]).includes(c.kind);

/** The text of a label: a plain string, or the English of inline text. */
export const labelText = (c: Pick<ProjectCheck, "label">): string => (typeof c.label === "string" ? c.label : c.label.en);

const range = (lo: number, hi: number): [number, number] => [lo, hi];

/** The English label a new check gets, and the one the editor compares against to tell custom text from generated. */
export function generatedLabel(c: ProjectCheck): string {
  switch (c.kind) {
    case "runs":
      return `runs for ${c.minMs} ms without an error`;
    case "serial":
      return `serial output contains "${c.match}"`;
    case "pin-level":
      return `pin ${c.pin} is ${c.level ? "HIGH" : "LOW"} at ${c.atMs} ms`;
    case "pin-toggles":
      return `pin ${c.pin} toggles every ${c.periodMs[0]} to ${c.periodMs[1]} ms`;
    case "pwm":
      return `pin ${c.pin} duty is ${c.duty[0]} to ${c.duty[1]} at ${c.atMs} ms`;
    case "tone":
      return `pin ${c.pin} plays ${c.hz[0]} to ${c.hz[1]} Hz at ${c.atMs} ms`;
    case "servo":
      return `pin ${c.pin} servo is ${c.deg[0]} to ${c.deg[1]} degrees at ${c.atMs} ms`;
    case "responds":
      return `pin ${c.pin} responds within ${c.withinMs} ms of ${c.after.input}`;
    case "code":
      return c.must.length + c.mustNot.length > 0 ? "code has the required text" : "code check";
    default:
      return c.kind;
  }
}

export function newCheck(kind: AuthorCheckKind, id: string, board: BoardPins): ProjectCheck {
  const base = { id, label: "", visibility: "visible" as const };
  const pin = { pin: board.defaultPin, ...(board.boardRef ? { board: board.boardRef } : {}) };
  let check: ProjectCheck;
  switch (kind) {
    case "runs":
      check = { ...base, kind, minMs: DEFAULT_AT_MS };
      break;
    case "serial":
      check = { ...base, kind, match: "", regex: false, minCount: 1 };
      break;
    case "pin-level":
      check = { ...base, kind, ...pin, level: 1, atMs: DEFAULT_AT_MS };
      break;
    case "pin-toggles":
      check = { ...base, kind, ...pin, periodMs: range(100, 5000), minCycles: 2 };
      break;
    case "pwm":
      check = { ...base, kind, ...pin, duty: range(0, 1), atMs: DEFAULT_AT_MS };
      break;
    case "tone":
      check = { ...base, kind, ...pin, hz: range(20, 20000), atMs: DEFAULT_AT_MS };
      break;
    case "servo":
      check = { ...base, kind, ...pin, deg: range(0, 180), atMs: DEFAULT_AT_MS };
      break;
    case "responds":
      check = { ...base, kind, ...pin, after: { t: 500, input: "button", value: 1 }, withinMs: 100, mode: "out", v: range(0, 1) };
      break;
    case "code":
      check = { ...base, kind, must: [], mustNot: [] };
      break;
  }
  return { ...check, label: generatedLabel(check) };
}

/** The first id of the form `c1`, `c2`... that no check in the list uses. */
export function nextCheckId(checks: readonly ProjectCheck[]): string {
  const used = new Set(checks.map((c) => c.id));
  let n = 1;
  while (used.has(`c${n}`)) n++;
  return `c${n}`;
}

function rangeOf(c: ProjectCheck): { field: string; bounds: readonly number[] } | null {
  switch (c.kind) {
    case "pin-toggles":
      return { field: "periodMs", bounds: c.periodMs };
    case "pwm":
      return { field: "duty", bounds: c.duty };
    case "tone":
      return { field: "hz", bounds: c.hz };
    case "servo":
      return { field: "deg", bounds: c.deg };
    case "responds":
      return { field: "v", bounds: c.v };
    default:
      return null;
  }
}

/** Problems with one check. A check with problems is still saved; the editor shows them next to the field. */
export function validateCheck(c: ProjectCheck, board: BoardPins, runMs?: number): CheckIssue[] {
  const issues: CheckIssue[] = [];
  if ("pin" in c && board.resolve(c.pin) === undefined) issues.push({ field: "pin", key: "checks.badPin", args: { pin: c.pin } });
  const ranged = rangeOf(c);
  if (ranged && ranged.bounds[0]! > ranged.bounds[1]!) issues.push({ field: ranged.field, key: "checks.rangeOrder" });
  if (c.kind === "serial" && c.regex) {
    if (c.match.length > MAX_REGEX_LENGTH) issues.push({ field: "match", key: "checks.regexLong", args: { max: MAX_REGEX_LENGTH } });
    else
      try {
        new RegExp(c.match);
      } catch {
        issues.push({ field: "match", key: "checks.badRegex" });
      }
  }
  if (runMs !== undefined && "atMs" in c && c.atMs > runMs) issues.push({ field: "atMs", key: "checks.afterRun", args: { runMs } });
  return issues;
}

const joinRange = ([lo, hi]: readonly number[]) => `${lo}–${hi}`;

/** The check's own values as short printable pairs. Each key is also the field's name in `checks.field.*`. */
export function summarise(c: AuthorCheck): { kind: AuthorCheckKind; fields: Record<string, string | number> } {
  switch (c.kind) {
    case "runs":
      return { kind: c.kind, fields: { minMs: c.minMs } };
    case "serial":
      return { kind: c.kind, fields: { match: c.match, minCount: c.minCount } };
    case "pin-level":
      return { kind: c.kind, fields: { pin: c.pin, level: c.level, atMs: c.atMs } };
    case "pin-toggles":
      return { kind: c.kind, fields: { pin: c.pin, periodMs: joinRange(c.periodMs), minCycles: c.minCycles } };
    case "pwm":
      return { kind: c.kind, fields: { pin: c.pin, duty: joinRange(c.duty), atMs: c.atMs } };
    case "tone":
      return { kind: c.kind, fields: { pin: c.pin, hz: joinRange(c.hz), atMs: c.atMs } };
    case "servo":
      return { kind: c.kind, fields: { pin: c.pin, deg: joinRange(c.deg), atMs: c.atMs } };
    case "responds":
      return { kind: c.kind, fields: { input: c.after.input, pin: c.pin, withinMs: c.withinMs } };
    case "code":
      return { kind: c.kind, fields: { must: c.must.length, mustNot: c.mustNot.length } };
  }
}

const findTest = (state: Pick<Project, "tests">, testId: string): TestCase | undefined => state.tests.find((t) => t.id === testId);

/** Puts the check in the test, replacing the one with its id. Returns no ops when a limit is reached. */
export function setCheckOps(state: Project, check: ProjectCheck, testId: string = DEFAULT_TEST_ID): Op[] {
  const test = findTest(state, testId);
  if (!test) {
    if (state.tests.length >= MAX_TESTS) return [];
    return [{ k: "test.set", test: { id: testId, name: DEFAULT_TEST_NAME, runMs: state.simulation.duration_ms, checks: [check] } }];
  }
  const at = test.checks.findIndex((c) => c.id === check.id);
  if (at < 0 && test.checks.length >= MAX_CHECKS) return [];
  const checks = at < 0 ? [...test.checks, check] : test.checks.map((c, i) => (i === at ? check : c));
  return [{ k: "test.set", test: { ...test, checks: checks as TestCase["checks"] } }];
}

/** Takes the check out. A test cannot hold zero checks, so removing its last one removes the test. */
export function removeCheckOps(state: Project, checkId: string, testId: string = DEFAULT_TEST_ID): Op[] {
  const test = findTest(state, testId);
  if (!test || !test.checks.some((c) => c.id === checkId)) return [];
  const rest = test.checks.filter((c) => c.id !== checkId);
  if (rest.length === 0) return [{ k: "test.remove", id: testId }];
  return [{ k: "test.set", test: { ...test, checks: rest as TestCase["checks"] } }];
}
