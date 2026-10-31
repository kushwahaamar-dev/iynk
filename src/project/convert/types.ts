/**
 * Types of the catalogue converter. `src/project` cannot import `src/content`, so the `Convert*` types below are a
 * local, import-free copy of the fields the builders read. `input-types.drift.test.ts` assigns the content types to
 * them, so a renamed or retyped field fails `npm run typecheck`. Closed id unions are plain `string` here.
 */

export type ConvertStateCond = Partial<Record<string, string | number | boolean | null>>;

export type ConvertBridgeCommand =
  | { type: "press"; id: string; choice?: string }
  | { type: "act"; name: string; data?: Record<string, unknown> }
  | { type: "set"; state: Record<string, unknown> };

export interface ConvertSource {
  title: string;
  url: string;
}

export interface ConvertFigurePart {
  id: string;
  short: string;
  role: string;
  name: string;
  what: string;
}

export interface ConvertFigureRef {
  page: string;
  parts: ConvertFigurePart[];
  sheets: string[];
}

/** A step of a board, a bench or a craft: the craft steps have no `kind`, `action` or `major`. */
export interface ConvertBuildStep {
  id: string;
  kind?: "build" | "break" | "test";
  part?: string;
  action?: ConvertBridgeCommand | null;
  done: ConvertStateCond;
  fault?: string;
  major?: boolean;
  title: string;
  body: string;
  refusal?: string;
}

export interface ConvertWorldEvent {
  t: number;
  input: string;
  value: number;
}

export type ConvertCheck =
  | { kind: "runs"; minMs: number; label: string }
  | { kind: "serial"; match: string; regex: boolean; minCount: number; byMs?: number; label: string }
  | { kind: "pin-level"; pin: string; level: 0 | 1; atMs: number; label: string }
  | { kind: "pin-toggles"; pin: string; periodMs: [number, number]; minCycles: number; label: string }
  | { kind: "pwm"; pin: string; duty: [number, number]; atMs: number; label: string }
  | { kind: "tone"; pin: string; hz: [number, number]; atMs: number; label: string }
  | { kind: "servo"; pin: string; deg: [number, number]; atMs: number; label: string }
  | {
      kind: "responds";
      after: ConvertWorldEvent;
      pin: string;
      withinMs: number;
      mode: string;
      v: [number, number];
      label: string;
    }
  | { kind: "code"; must: string[]; mustNot: string[]; label: string }
  | { kind: "state"; atMs: number; equals: ConvertStateCond; label: string }
  | { kind: "node-voltage"; net: string; volts: [number, number]; atMs: number; label: string }
  | { kind: "supply-current"; net: string; amps: [number, number]; atMs: number; label: string };

export interface ConvertWorldInput {
  id: string;
  quantity: string;
  device: { kind: string; [field: string]: unknown };
  pins: string[];
  part: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  gesture: string;
  label: string;
}

export interface ConvertWorldModel {
  inputs: ConvertWorldInput[];
  script: ConvertWorldEvent[];
}

export type ConvertParamChip =
  | {
      id: string;
      kind: "number";
      label: string;
      default: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
      keepApart?: { param: string; op: "<" | ">"; gap: number };
      figure?: { part: string; key: string };
    }
  | {
      id: string;
      kind: "choice";
      label: string;
      default: string;
      options: { value: string; code: string; figureValue?: string | number; label: string; note?: string }[];
      figure?: { part: string; key: string };
    }
  | {
      id: string;
      kind: "toggle";
      label: string;
      default: boolean;
      code: { on: string; off: string };
      figure?: { part: string; key: string };
    };

export interface ConvertCodeTemplate {
  source: string;
  libraries: string[];
  top?: string;
  ports?: Record<string, string[]>;
}

export interface ConvertSerialSpec {
  baud: number;
  sample: string[];
}

export interface ConvertQuiz {
  id: string;
  afterStep: string | null;
  questions: { id: string; q: string; options: string[]; answer: number; why: string }[];
}

export interface ConvertLesson {
  id: string;
  n: number;
  level: string;
  language: string;
  code: ConvertCodeTemplate;
  params: ConvertParamChip[];
  circuit: string | null;
  world: ConvertWorldModel;
  serial: ConvertSerialSpec;
  runMs: number;
  checks: ConvertCheck[];
  variants: string[];
  pins: { pin: string; to: string; role: string; color: string }[];
  callouts: { part: string; text: string }[];
  specs: { label: string; value: string }[];
  features: { icon: string; text: string }[];
  title: string;
  lede: string;
  steps: string[];
  hints: string[];
  quiz?: ConvertQuiz;
}

export interface ConvertPinRow {
  header: string;
  pin: string;
  label: string;
  caps: string[];
  net: string;
}

export interface ConvertBoardContent {
  lab: "board";
  id: string;
  variants: { id: string; name: string; note: string; figureVariant: string }[];
  pinout: ConvertPinRow[];
  figure: ConvertFigureRef;
  assembly: ConvertBuildStep[];
  lessons: ConvertLesson[];
  serial: ConvertSerialSpec;
  sources: ConvertSource[];
  title: string;
  tagline: string;
  overview: string;
}

export interface ConvertBenchMode {
  id: string;
  instant: boolean;
  language: string;
  code: ConvertCodeTemplate;
  bytes: number;
  serial: string[];
  title: string;
}

export interface ConvertFailureEffect {
  power: string;
  halts: boolean;
  pins?: Record<string, string>;
  damages?: string[];
  extraMa?: number;
  serial?: string[];
}

export interface ConvertFailureMode {
  id: string;
  kind: string;
  trigger: { by: string; nets?: [string, string]; [field: string]: unknown };
  figure: ConvertBridgeCommand;
  effect: ConvertFailureEffect;
  title: string;
  symptom: string;
  explanation: string;
  fix: string;
}

export interface ConvertStatusField {
  id: string;
  key: string;
  format: string;
  label: string;
}

export interface ConvertCurrentModel {
  supplies: { id: string; volts: number; limitMa: number; label: string }[];
  loads: {
    id: string;
    supply: string;
    ma: number;
    when: ConvertStateCond;
    perUnit?: { key: string; maPerUnit: number };
    label: string;
  }[];
}

export interface ConvertPracticeTask {
  id: string;
  board: string;
  language: string;
  starter: ConvertCodeTemplate;
  solution: string;
  circuit: string | null;
  world: ConvertWorldModel;
  runMs: number;
  checks: ConvertCheck[];
  title: string;
  brief: string;
  hints: string[];
}

export interface ConvertRoboticsContent {
  lab: "robotics";
  id: string;
  fig: number;
  board: string | null;
  modules: string[];
  parts: string[];
  figure: ConvertFigureRef;
  power: { source: string; label: string; ok: string };
  modes: ConvertBenchMode[];
  defaultMode: string;
  steps: ConvertBuildStep[];
  faults: ConvertFailureMode[];
  status: ConvertStatusField[];
  current: ConvertCurrentModel;
  tasks: ConvertPracticeTask[];
  quizzes: ConvertQuiz[];
  sources: ConvertSource[];
  title: string;
  sub: string;
  hint: string;
  overview: string;
}

export interface ConvertDronePart {
  id: string;
  short: string;
  name: string;
  what: string;
}

export interface ConvertDroneFrame {
  layout: string;
  sizeMm: number;
  stackMm?: number;
  motors: [x: number, y: number, label: string, dir: string][];
  propDirection?: string;
}

export interface ConvertDroneWire {
  from: string;
  to: string;
  kind: string;
  label: string;
  note: string;
}

export interface ConvertDroneTest {
  id: string;
  kind: string;
  button: string;
  done: ConvertStateCond;
  title: string;
  pass: string;
  fail: string;
}

export interface ConvertFirmwareConfig {
  firmware: string;
  version: string;
  cliName: string;
  snippets: { id: string; code: string; mode: string; title: string; explain: string }[];
  emulator: unknown;
  sources: ConvertSource[];
}

export interface ConvertFlightConfig {
  physics: string;
  params: Record<string, number>;
  look?: unknown;
  modes: {
    id: string;
    kind: string;
    mission?: string;
    title: string;
    hint: string;
    attitude?: string;
    expo?: number;
    angleLimit?: number;
    rateScale?: number;
  }[];
  defaultMode: string;
  fpv: { fovDeg: number; camTiltDeg: number; gimbal: boolean };
  osd: string[];
  failsafes: { id: string; trigger: string; action: string; note: string }[];
  controls: string;
}

export interface ConvertGoal {
  x: number;
  y: number;
  z: number;
  r: number;
  heading?: number;
  label: string;
  land?: boolean;
  hold?: number;
  action?: string;
  speed?: number;
  led?: string;
}

export interface ConvertCourse {
  id: string;
  kind: string;
  field: { w: number; d: number };
  pad: [number, number];
  prims: unknown[];
  gates: [number, number, number][];
  gateSize?: [number, number];
  goals: ConvertGoal[];
  par?: { gold: number; silver: number; bronze: number };
  ceiling?: number;
  title: string;
  brief: string;
}

export interface ConvertDroneContent {
  lab: "drone";
  id: string;
  fig: number;
  class: string;
  frame: ConvertDroneFrame;
  design: unknown;
  figure: ConvertFigureRef;
  parts: ConvertDronePart[];
  build: ConvertBuildStep[];
  wiring: ConvertDroneWire[];
  tests: ConvertDroneTest[];
  firmware: ConvertFirmwareConfig;
  flight: ConvertFlightConfig;
  courses: ConvertCourse[];
  quizzes: ConvertQuiz[];
  sources: ConvertSource[];
  title: string;
  sub: string;
  hint: string;
  noun: string;
  overview: string;
  practice: string;
}

export type CatalogueItem =
  | { lab: "board"; id: string; meta: unknown; data: ConvertBoardContent; en: Record<string, string> }
  | { lab: "robotics"; id: string; meta: unknown; data: ConvertRoboticsContent; en: Record<string, string> }
  | { lab: "drone"; id: string; meta: unknown; data: ConvertDroneContent; en: Record<string, string> };

export type Texts = Record<"en" | "de" | "es" | "fr" | "hi" | "zh", Record<string, string>>;

export interface FigureCircuit {
  title?: string;
  breadboard: "half" | "full" | "mini";
  parts: { id: string; part: string; holes?: string[]; [param: string]: unknown }[];
  wires: { from: string; to: string; color?: string }[];
}

/** One header part of a figure board: its pin ids are `<id>.<position + 1>` and each entry is a net name. */
export interface FigureHeader {
  id: string;
  pins: (string | null)[];
}

export interface FigureBench {
  id: string;
  board: string | null;
  variant?: string;
  periph: { id: string; board?: string; part?: string; variant?: string }[];
  wires: { from: string; to: string; color?: string }[];
  pinMap: Record<string, string>;
  circuits: Record<string, FigureCircuit>;
  headers: FigureHeader[];
  periphHeaders: Record<string, FigureHeader[]>;
}

export type ReportCode =
  | "no-descriptor"
  | "legacy-circuit"
  | "unresolved-endpoint"
  | "unknown-part"
  | "code-comments-en-only"
  | "hidden-solution"
  | "third-party-unchecked"
  | "bench-circuit-unresolved"
  | "skipped";

export interface ReportItem {
  item: string;
  project?: string;
  code: ReportCode;
  message: string;
  refs?: string[];
}
