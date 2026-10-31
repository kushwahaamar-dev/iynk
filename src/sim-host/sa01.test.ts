// @vitest-environment node
// SA-01 leg A: every lesson and practice task of src/content, reference and starter, runs through the
// sim host's check path (inline port, so each message crosses a structured clone) and must give the outcome
// a direct runChecks gives.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BoardContent, Language, PracticeTask, RoboticsContent } from "@/content/schema";
import { boardLoaders, roboticsLoaders } from "@/content/index.generated";
import { defaultParams, renderTemplate, resolveText } from "@/lib/boardlab/template";
import { lessonJob, runChecks, taskJob, type CheckJob } from "@/lib/interp";
import { createInlinePort } from "@/protocol";
import { createSimHandler } from "./handler";
import { createSimHost } from "./host";

const EMPTY: Record<Language, string> = {
  "arduino-cpp": "void setup() {\n}\n\nvoid loop() {\n}\n",
  micropython: "pass\n",
  python: "pass\n",
  verilog: "module top();\nendmodule\n",
};

function prose(lab: "boards" | "robotics", id: string): (key: string) => string {
  const file = join(process.cwd(), "src/i18n/content/en", lab, `${id}.json`);
  const json: unknown = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  return (key) => {
    const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), json);
    return typeof v === "string" ? v : key;
  };
}

const host = createSimHost({
  makePort: () =>
    createInlinePort(
      createSimHandler({
        diag: false,
        wallMs: () => performance.now(),
        schedule: (fn) => void setTimeout(fn, 0),
        makeEngine: () => {
          throw new Error("a check job builds no run");
        },
        makeDigital: () => {
          throw new Error("a check job builds no run");
        },
      }),
    ),
});

let compared = 0;

async function same(label: string, job: CheckJob) {
  const direct = runChecks(job);
  const viaHost = await host.check(job);
  expect(viaHost, label).toEqual(direct);
  compared++;
  return direct;
}

describe("SA-01 leg A: check jobs through the sim host equal runChecks", async () => {
  const boards = Object.entries(boardLoaders) as [string, () => Promise<{ default: BoardContent }>][];
  const benches = Object.entries(roboticsLoaders) as [string, () => Promise<{ default: RoboticsContent }>][];
  let items = 0;

  for (const [id, load] of boards) {
    const board = (await load()).default;
    const text = prose("boards", id);
    for (const lesson of board.lessons) {
      items++;
      it(`${id} / ${lesson.id}`, async () => {
        const code = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
        await same("reference", lessonJob(board, lesson, code));
        const starter = await same("starter", lessonJob(board, lesson, EMPTY[lesson.language]));
        expect(starter.results.every((r) => r.ok), "the empty program must fail at least one check").toBe(false);
      });
    }
  }
  for (const [id, load] of benches) {
    const bench = (await load()).default;
    const text = prose("robotics", id);
    for (const task of bench.tasks as PracticeTask[]) {
      items++;
      it(`${id} / ${task.id}`, async () => {
        await same("reference", taskJob(task, task.solution));
        const starter = await same("starter", taskJob(task, resolveText(task.starter.source, text)));
        expect(starter.results.every((r) => r.ok), "the starter must fail at least one check").toBe(false);
      });
    }
  }

  it("covers all 102 lessons and tasks", () => {
    console.log(`SA-01 leg A: ${items} lessons and tasks, ${compared} check jobs equal through the host`);
    expect(items).toBe(102);
    expect(compared).toBe(items * 2);
  });
});
