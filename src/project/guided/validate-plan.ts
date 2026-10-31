import type { Project } from '../generated/types.ts';
import {
  COMPLETE_GATES,
  GATE_KINDS,
  GUIDED_MODES,
  PLAN_VERSION,
  RUNGS,
  type PlanIssue,
} from './plan.ts';

const MAX_GATES = 64;
const MAX_SKILLS = 8;
const MAX_NEXT = 4;
const WIRE_COLORS = ['red', 'black', 'orange', 'yellow', 'green', 'blue', 'white', 'purple', 'brown', 'grey'];
const HEX64 = /^[0-9a-f]{64}$/;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

function issue(rule: PlanIssue['rule'], severity: PlanIssue['severity'], path: string, message: string): PlanIssue {
  return { rule, severity, path, message };
}

const shape = (path: string, message: string) => issue('schema', 'error', path, message);

function isPinAddr(v: unknown): boolean {
  return isObj(v) && isStr(v.c) && v.c !== '' && isStr(v.p) && v.p !== '';
}

function isPinPair(v: unknown): boolean {
  return Array.isArray(v) && v.length === 2 && v.every(isPinAddr);
}

function gateShapeIssue(gate: Obj): string | null {
  switch (gate.kind) {
    case 'manual':
      return null;
    case 'check':
      return isStr(gate.test) && isStr(gate.check) ? null : 'a check gate needs string test and check';
    case 'edit':
      return isStr(gate.source) ? null : 'an edit gate needs a string source';
    case 'param':
      return isStr(gate.parameter) ? null : 'a param gate needs a string parameter';
    case 'net':
      return isPinPair(gate.connected) !== isPinPair(gate.apart)
        ? null
        : 'a net gate needs exactly one of connected or apart, a pair of {c, p}';
    case 'part':
      return isStr(gate.definition) && Number.isInteger(gate.min) && (gate.min as number) >= 1
        ? null
        : 'a part gate needs a string definition and an integer min of at least 1';
    case 'quiz':
      return isStr(gate.quiz) ? null : 'a quiz gate needs a string quiz';
    case 'fault':
      return gate.state === 'injected' || gate.state === 'cleared' ? null : 'a fault gate needs state injected or cleared';
    case 'legacy-state':
      return isObj(gate.cond) && Object.values(gate.cond).every((x) => x === null || ['string', 'number', 'boolean'].includes(typeof x))
        ? null
        : 'a legacy-state gate needs a cond of scalar values';
    default:
      return null;
  }
}

function shapeIssues(plan: unknown): PlanIssue[] {
  if (!isObj(plan)) return [shape('', 'the plan must be an object')];
  const out: PlanIssue[] = [];
  if (plan.v !== PLAN_VERSION) out.push(shape('v', `v must be ${PLAN_VERSION}`));
  if (!(GUIDED_MODES as readonly unknown[]).includes(plan.mode)) out.push(shape('mode', `mode must be one of ${GUIDED_MODES.join(', ')}`));
  if (!(RUNGS as readonly unknown[]).includes(plan.rung)) out.push(shape('rung', `rung must be one of ${RUNGS.join(', ')}`));
  if (!isStrList(plan.skill) || plan.skill.length > MAX_SKILLS || plan.skill.some((s) => s.length < 1 || s.length > 40)) {
    out.push(shape('skill', `skill must hold at most ${MAX_SKILLS} strings of 1 to 40 characters`));
  }
  if (!Array.isArray(plan.complete) || !plan.complete.every((g) => (COMPLETE_GATES as readonly unknown[]).includes(g))) {
    out.push(shape('complete', `complete must list gates from ${COMPLETE_GATES.join(', ')}`));
  }
  if (!isStrList(plan.tests)) out.push(shape('tests', 'tests must be a list of test ids'));
  if (plan.goalTest !== undefined && !isStr(plan.goalTest)) out.push(shape('goalTest', 'goalTest must be a test id'));
  for (const key of ['starterTokensSha256', 'starterSubstanceHash']) {
    if (plan[key] !== undefined && !(isStr(plan[key]) && HEX64.test(plan[key]))) out.push(shape(key, `${key} must be 64 lower-case hex characters`));
  }
  if (plan.partial !== undefined && !(isObj(plan.partial) && isStrList(plan.partial.given))) {
    out.push(shape('partial', 'partial must be {given: string[]}'));
  }
  if (plan.next !== undefined && !(isStrList(plan.next) && plan.next.length <= MAX_NEXT)) {
    out.push(shape('next', `next must hold at most ${MAX_NEXT} template ids`));
  }
  if (!Array.isArray(plan.gates) || plan.gates.length > MAX_GATES) {
    out.push(shape('gates', `gates must be a list of at most ${MAX_GATES}`));
  } else {
    plan.gates.forEach((gate, i) => {
      const path = `gates/${i}`;
      if (!isObj(gate)) return out.push(shape(path, 'a gate must be an object'));
      if (!Number.isInteger(gate.step) || (gate.step as number) < 0) out.push(shape(`${path}/step`, 'step must be a non-negative integer'));
      if (!(GATE_KINDS as readonly unknown[]).includes(gate.kind)) return out.push(shape(`${path}/kind`, `kind must be one of ${GATE_KINDS.join(', ')}`));
      const problem = gateShapeIssue(gate);
      if (problem) out.push(shape(path, problem));
    });
  }
  return out;
}

function stepCount(project: Project): number {
  const guide = project.guide;
  if (!guide) return 0;
  return (guide.kind === 'tour' ? guide.assembly : guide.steps)?.length ?? 0;
}

function pinAddrs(gate: Obj): { c: string; p: string }[] {
  return [...((gate.connected as { c: string; p: string }[] | undefined) ?? []), ...((gate.apart as { c: string; p: string }[] | undefined) ?? [])];
}

function crossIssues(plan: Obj, project: Project): PlanIssue[] {
  const out: PlanIssue[] = [];
  const steps = stepCount(project);
  const tests = new Map(project.tests.map((t) => [t.id, new Set(t.checks.map((c) => c.id))]));
  const quizzes = new Set((project.guide?.quizzes ?? []).map((q) => q.id));
  const components = new Set(project.components.map((c) => c.id));
  const seen = new Set<number>();

  (plan.gates as Obj[]).forEach((gate, i) => {
    const path = `gates/${i}`;
    const step = gate.step as number;
    if (step >= steps) out.push(issue('G1', 'error', path, `step ${step} is outside the ${steps} steps of the guide`));
    else if (seen.has(step)) out.push(issue('G1', 'error', path, `step ${step} already has a gate`));
    seen.add(step);

    if (gate.kind === 'check') {
      const checks = tests.get(gate.test as string);
      if (!checks) out.push(issue('G2', 'warning', path, `no test "${gate.test}"`));
      else if (!checks.has(gate.check as string)) out.push(issue('G2', 'warning', path, `test "${gate.test}" has no check "${gate.check}"`));
    } else if (gate.kind === 'quiz' && !quizzes.has(gate.quiz as string)) {
      out.push(issue('G2', 'warning', path, `no quiz "${gate.quiz}"`));
    } else if (gate.kind === 'net') {
      const missing = pinAddrs(gate).find((addr) => !components.has(addr.c));
      if (missing) out.push(issue('G2', 'warning', path, `no component "${missing.c}"`));
    } else if (gate.kind === 'legacy-state' && !project.guide?.legacyFigure) {
      out.push(issue('G3', 'warning', path, 'a legacy-state gate needs guide.legacyFigure'));
    }
  });

  (plan.tests as string[]).forEach((id, i) => {
    if (!tests.has(id)) out.push(issue('G2', 'warning', `tests/${i}`, `no test "${id}"`));
  });
  if (typeof plan.goalTest === 'string' && !tests.has(plan.goalTest)) {
    out.push(issue('G2', 'warning', 'goalTest', `no test "${plan.goalTest}"`));
  }
  return out;
}

/**
 * Checks a guided plan against its shape and against the project it belongs to. Shape problems and bad step
 * indexes are errors; a gate that names something missing is a warning, and the dock treats that step as manual.
 */
export function validatePlan(plan: unknown, project: Project): PlanIssue[] {
  const shapeProblems = shapeIssues(plan);
  return shapeProblems.length > 0 ? shapeProblems : crossIssues(plan as Obj, project);
}

function wireableIssues(item: unknown, path: string): PlanIssue[] {
  if (!isObj(item)) return [shape(path, 'an item must be an object')];
  const out: PlanIssue[] = [];
  if (!isStr(item.part) || item.part === '') out.push(shape(`${path}/part`, 'part must be a component definition id'));
  if (typeof item.supplyVolts !== 'number' || !Number.isFinite(item.supplyVolts) || item.supplyVolts < 0) {
    out.push(shape(`${path}/supplyVolts`, 'supplyVolts must be a number of at least 0'));
  }
  if (item.note === undefined) out.push(shape(`${path}/note`, 'note is required'));
  if (!Array.isArray(item.connections)) {
    out.push(shape(`${path}/connections`, 'connections must be a list'));
  } else {
    item.connections.forEach((link, i) => {
      const at = `${path}/connections/${i}`;
      if (!isObj(link) || !isStr(link.from) || !isStr(link.to)) out.push(shape(at, 'a connection needs string from and to'));
      else if (!WIRE_COLORS.includes(link.color as string)) out.push(shape(`${at}/color`, `color must be one of ${WIRE_COLORS.join(', ')}`));
    });
  }
  return out;
}

/** Checks the wire-it lists of `ext["x-iynk-wireables"]`. */
export function validateWireables(ext: unknown): PlanIssue[] {
  if (!isObj(ext)) return [shape('', 'the wireables must be an object')];
  if (ext.v !== 1) return [shape('v', 'v must be 1')];
  if (!Array.isArray(ext.items)) return [shape('items', 'items must be a list')];
  return ext.items.flatMap((item, i) => wireableIssues(item, `items/${i}`));
}
