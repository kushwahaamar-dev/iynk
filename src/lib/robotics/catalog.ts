// The Robotics Lab index: benches in figure order, grouped by roadmap month, and the progress keys
// one bench counts (steps + tasks + quizzes, ARCHITECTURE §6).

import { ROBOTICS, ROBOTICS_IDS, type BoardId, type RoboticsId } from "@/content/ids";
import type { RoboticsContent } from "@/content/schema";
import { progressKey } from "@/lib/progress/keys";

export type Month = 0 | 1 | 2 | 3 | 4 | 5;

/** The original's roadmap months, with the labels fixed (it called months 3 and 4 "Month 2"). */
export const BENCH_MONTH: Record<RoboticsId, Month> = {
  "uno-r3-build": 0,
  "led-resistor": 1,
  "transistor-switch": 1,
  "esp32-s3-build": 2,
  tb6612fng: 3,
  l298n: 3,
  a4988: 3,
  pca9685: 3,
  mpu6050: 4,
  "hc-sr04": 4,
  "qtr-8rc": 4,
  lm2596: 5,
  "pi5-ros2": 5,
};

export const MONTHS: readonly Month[] = [0, 1, 2, 3, 4, 5];

export function benchesByMonth(): { month: Month; ids: RoboticsId[] }[] {
  return MONTHS.map((month) => ({ month, ids: ROBOTICS_IDS.filter((id) => BENCH_MONTH[id] === month) }));
}

/** Product names of the controllers on the mat (literal, never translated). */
const BOARD_PRODUCT: Partial<Record<BoardId, string>> = {
  "uno-r3": "Arduino Uno R3",
  nano: "Arduino Nano",
  "esp32-s3-devkitc-1": "ESP32-S3-DevKitC-1",
  "pi4-pi5": "Raspberry Pi 4 / 5",
};

const VARIANT_PRODUCT: Record<string, string> = { "pi4-pi5:pi5": "Raspberry Pi 5", "pi4-pi5:pi4": "Raspberry Pi 4" };

export function boardProduct(id: RoboticsId): string | null {
  const meta = ROBOTICS[id];
  if (!meta.board) return null;
  if (meta.boardVariant) {
    const named = VARIANT_PRODUCT[`${meta.board}:${meta.boardVariant}`];
    if (named) return named;
  }
  return BOARD_PRODUCT[meta.board] ?? meta.board;
}

export function nextBench(id: RoboticsId): RoboticsId | null {
  const i = ROBOTICS_IDS.indexOf(id);
  return ROBOTICS_IDS[i + 1] ?? null;
}

export function prevBench(id: RoboticsId): RoboticsId | null {
  const i = ROBOTICS_IDS.indexOf(id);
  return i > 0 ? ROBOTICS_IDS[i - 1] : null;
}

export type BenchKeys = { steps: string[]; tasks: string[]; quizzes: string[] };

export function benchKeys(bench: Pick<RoboticsContent, "id" | "steps" | "tasks" | "quizzes">): BenchKeys {
  return {
    steps: bench.steps.map((step) => progressKey.roboticsStep(bench.id, step.id)),
    tasks: bench.tasks.map((task) => progressKey.roboticsTask(bench.id, task.id)),
    quizzes: bench.quizzes.map((quiz) => progressKey.roboticsQuiz(bench.id, quiz.id)),
  };
}

/** What the serial panel is called: a serial monitor, bench notes (no controller) or an SSH terminal (Linux). */
export function terminalKind(bench: Pick<RoboticsContent, "board">): "serial" | "notes" | "terminal" {
  if (bench.board === null) return "notes";
  return bench.board === "pi4-pi5" ? "terminal" : "serial";
}
