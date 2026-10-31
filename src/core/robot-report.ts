export interface PhysicsFrame {
  atNs: number;
  bodies: Record<string, { p: [number, number, number]; yawRad: number }>;
  sensors?: Record<string, number | string>;
}

export interface RobotProblem {
  code: string;
  severity: "error" | "warning";
  path: string;
  messageKey: string;
  args: Record<string, string | number>;
}

export type CheckId =
  | "RB-C-01"
  | "RB-C-02"
  | "RB-C-03"
  | "RB-C-04"
  | "RB-C-05"
  | "RB-C-06"
  | "RB-C-07"
  | "RB-C-08"
  | "RB-C-09"
  | "RB-C-10";

export interface RobotCheck {
  id: CheckId;
  result: "ok" | "warn" | "fail";
  value: number | null;
  unit: string;
  limit: number | null;
  limitingPart: string | null;
  formula: string;
  assumptions: string[];
  causeId?: string;
}

export interface CouplingReport {
  motorId: string;
  c: number;
  hc: number;
  ok: boolean;
  mode: "cycle" | "algebraic";
}

export interface RunMetrics {
  maxCrossTrackMm: number;
  onLineFraction: number;
  laps: number;
  progressMm: number;
  text: string[];
}

export interface LoopStats {
  n: number;
  meanNs: number;
  p95Ns: number;
  maxNs: number;
  jitterNs: number;
  histogram: { loNs: number; hiNs: number; count: number }[];
}

export interface StepMetrics {
  riseNs: number | null;
  overshootPct: number;
  settleNs: number | null;
  steadyError: number;
}

export interface PidTrace {
  tNs: number[];
  setpoint: number[];
  response: number[];
  output: number[];
  integral: number[];
}

export interface MechReport {
  runHash: string;
  sceneHash: string;
  checkpoints: string[];
  run: RunMetrics | null;
  loop: LoopStats | null;
}
