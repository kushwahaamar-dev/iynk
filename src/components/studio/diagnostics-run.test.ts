// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createMemoryRepository, emptyRows } from "@/local/memory-repository";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost } from "@/local/project-host";
import { createShadow } from "@/local/shadow";
import { builtinRegistry } from "@/parts/builtin";
import { bigProject } from "@/project/testing/generators";
import { createInlinePort } from "@/protocol";
import { createSimHandler } from "@/sim-host/handler";
import { createSimHost } from "@/sim-host/host";
import { createInterpEngine } from "@/sim-host/engines/interp-engine";
import { INTERP_LANGUAGE } from "@/lib/interp";
import type { BoardId } from "@/lib/interp/profiles";
import { createDigitalNets } from "@/sim/digital/nets";
import { runKill, runLessonCheck, runProbe, runSample, runSaveSpeed, runTen, type DiagDeps, type ProbeName } from "./diagnostics-run";

function rig(): DiagDeps {
  const sim = createSimHost({
    makePort: () =>
      createInlinePort(
        createSimHandler({
          diag: false,
          wallMs: () => performance.now(),
          schedule: (fn) => void setTimeout(fn, 0),
          makeEngine: (program, net, opts) => {
            const board = net.parts.find((p) => p.kind === "board")!;
            return createInterpEngine({
              id: board.id,
              board: board.descriptor.replace(/^core\./, "").replace(/@.*$/, "") as BoardId,
              language: INTERP_LANGUAGE[(program.kind === "source" ? program.language : "arduino-cpp") as keyof typeof INTERP_LANGUAGE] ?? "arduino",
              seed: opts.seed,
            });
          },
          makeDigital: createDigitalNets,
        }),
      ),
  });
  const repo = createMemoryRepository({ rows: emptyRows() });
  const project = createProjectHost({
    makePort: () => createInlinePort(createProjectHandler({ repo, shadowFactory: createShadow, clock: () => 5_000 })),
    local: null,
    caches: null,
    sw: null,
  });
  let now = 0;
  return {
    sim,
    project,
    diagSim: () => {
      throw new Error("a stall needs a real worker");
    },
    reg: builtinRegistry(),
    wallMs: () => (now += 3),
    frames: { maxGapMs: () => 16 },
  };
}

describe("Diagnostics drivers", () => {
  it("runs the sample: 4 LED edges in 2 s, no serial, a 16 digit hash", async () => {
    const out = await runSample(rig(), 2);
    expect(out).toMatchObject({ ledEdges: 4, serial: "", limit: null });
    expect(out.traceHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("gives 10 LED edges over the full 5 s run", async () => {
    expect((await runSample(rig())).ledEdges).toBe(10);
  });

  it("runs the sample ten times with one hash", async () => {
    expect(await runTen(rig())).toEqual({ equal: 10, of: 10, firstDiff: null });
  });

  it.each<ProbeName>(["list-repeat", "bytearray-loop", "c-array", "string-double"])("ends the %s probe in a limit", async (which) => {
    const out = await runProbe(rig(), which);
    expect(out).toMatchObject({ ended: "limit", workerAnswers: true });
    expect(out.message).not.toBe("");
  });

  it("lets the endless loop run to the end of the run, and the worker answers after it", async () => {
    expect(await runProbe(rig(), "endless-loop")).toMatchObject({ ended: "run-length", workerAnswers: true });
  });

  it("recovers the sim worker with the same trace", async () => {
    const out = await runKill(rig(), "sim");
    expect(out.hashAfter).toBe(out.hashBefore);
  });

  it("recovers the project worker with the same document hash", async () => {
    const out = await runKill(rig(), "project");
    expect(out.hashAfter).toBe(out.hashBefore);
    expect(out.hashBefore).toMatch(/^[0-9a-f]{64}$/);
  });

  it("times commit to saved on a 500 part project", async () => {
    const out = await runSaveSpeed(rig(), bigProject(500, 1000, 1), 10);
    expect(out.samples).toBe(10);
    expect(out.p50).toBeGreaterThan(0);
    expect(out.p95).toBeGreaterThanOrEqual(out.p50);
  });

  it("finds five board lessons equal through the worker", async () => {
    expect(await runLessonCheck(rig(), 5)).toEqual({ equal: 5, of: 5 });
  }, 60_000);

  it("keeps test support out of the app files", () => {
    for (const file of ["Diagnostics.tsx", "diagnostics-run.ts"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text, file).not.toMatch(/project\/testing|\.test["']/);
    }
  });
});
