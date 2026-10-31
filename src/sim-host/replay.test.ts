// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { loadSources } from "../../scripts/convert-catalogue.mjs";
import { builtinRegistry } from "@/parts/builtin";
import { convertAll } from "@/project/convert";
import type { ConvertedProject, ConvertSources } from "@/project/convert";
import type { ConvertContext } from "@/project/convert/lesson";
import type { CatalogueItem } from "@/project/convert/types";
import type { Project } from "@/project/generated/types";
import { NS_PER_MS } from "@/sim/core/clock";
import { StateHasher } from "@/sim/core/hash";
import { createDigitalNets } from "@/sim/digital/nets";
import { RANK, type Engine, type EventSink, type SimEvent, type SliceBudget } from "@/sim/engine";
import { buildSimNetlist } from "@/sim/netlist";
import { createOrchestrator } from "@/sim/orchestrator";
import { createRecorder, type ReplayRecord } from "@/sim/replay/record";
import { replay } from "@/sim/replay/replay";
import { createInterpEngine } from "./engines/interp-engine";

const BUDGET: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };
const RUN_NS = 5_000_000_000;
const RUNS = 10;
const ENGINES = { "engine:interp-arduino": "1.0.0" };

/** One 5 s run of a converted project's firmware, with the extra engines it is given. */
function run(project: Project, extra: Engine[] = []): ReplayRecord {
  const firmware = project.sources.find((s) => s.role === "firmware" && s.language === "arduino-cpp")!;
  const { net } = buildSimNetlist(project, builtinRegistry());
  if (net.ground === "") {
    net.nets.push({ id: "gnd" });
    net.ground = "gnd";
  }
  const mcu = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: project.simulation.seed });
  const image = { kind: "source" as const, language: "arduino-cpp" as const, files: [{ path: firmware.path, text: firmware.content }], entry: firmware.path };
  expect(mcu.load(image).ok, project.id).toBe(true);
  const orch = createOrchestrator({ engines: [mcu, ...extra], digital: createDigitalNets() });
  const opts = { seed: net.settings.seed, speed: 1, limits: { statements: 4_000_000, events: 100_000, outputBytes: 65_536 }, tier: "T1" as const, endNs: RUN_NS };
  expect(orch.load(net, opts).ok, project.id).toBe(true);
  const recorder = createRecorder(orch, { docHash: net.docHash, settings: net.settings, engineVersions: ENGINES, serial: () => mcu.serialLog });
  orch.runUntil(RUN_NS, BUDGET);
  return recorder.finish(orch.now);
}

const asRun = (project: Project, extra: () => Engine[] = () => []) => () => {
  const { checkpoints, pinTraceHash, serialHash } = run(project, extra());
  return { checkpoints, pinTraceHash, serialHash };
};

describe("SA-06: ten runs of each converted Uno arduino-cpp project", () => {
  let unos: ConvertedProject[];

  beforeAll(async () => {
    const { listItems } = await import("../../scripts/convert-io.mjs");
    const loaded = await loadSources(listItems());
    const converted = convertAll(loaded.items as CatalogueItem[], loaded.sources as ConvertSources, loaded.ctx as ConvertContext);
    unos = converted.projects.filter(
      (p) =>
        p.project.boards.some((b) => b.definition.ref === "core.uno-r3") &&
        p.project.sources.some((s) => s.role === "firmware" && s.language === "arduino-cpp"),
    );
  }, 120_000);

  it("gives one serial hash and one pin-trace hash per project", () => {
    expect(unos.length).toBeGreaterThan(10);
    for (const { id, project } of unos) {
      const first = run(project);
      for (let i = 1; i < RUNS; i++) {
        const again = run(project);
        expect(again.serialHash, `${id} serial run ${i}`).toBe(first.serialHash);
        expect(again.pinTraceHash, `${id} pin trace run ${i}`).toBe(first.pinTraceHash);
        expect(again.checkpoints, `${id} checkpoints run ${i}`).toEqual(first.checkpoints);
      }
    }
    console.info(`SA-06: ${unos.length} Uno arduino-cpp projects, ${RUNS} runs each, no difference`);
  }, 600_000);

  it("replays a recorded run with no difference", () => {
    const { project } = unos.find((p) => p.id === "prj_uno-r3-blink")!;
    const record = run(project);
    expect(record.checkpoints.length).toBe(5);
    expect(replay(record, asRun(project))).toEqual({ ok: true });
  });

  it("detects a run that uses Math.random", () => {
    const { project } = unos.find((p) => p.id === "prj_uno-r3-blink")!;
    const recorded = run(project, [new NoiseEngine()]);
    const verdict = replay(recorded, asRun(project, () => [new NoiseEngine()]));
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.first.what).toBe("checkpoint");
  });
});

/** Writes a pin every millisecond from `Math.random`, the mutation the determinism lint exists to stop. */
class NoiseEngine implements Engine {
  readonly id = "noise";
  readonly rank = RANK.env;
  private sink: EventSink | null = null;
  private next = NS_PER_MS;
  private highs = 0;
  attach(sink: EventSink): void {
    this.sink = sink;
  }
  nextDue(): number {
    return this.next;
  }
  advanceTo(horizon: number): { reached: number; stoppedEarly: boolean } {
    while (this.next <= horizon) {
      const level = Math.random() < 0.5 ? 0 : 1;
      this.highs += level;
      this.sink?.emit({ at: this.next, phase: 2, rank: this.rank, src: this.id, kind: "pin", payload: { pin: "D12", level } } satisfies Omit<SimEvent, "seq">);
      this.next += NS_PER_MS;
    }
    return { reached: horizon, stoppedEarly: false };
  }
  onEvent(): void {}
  stateHash(): string {
    return new StateHasher().int(this.highs).hex();
  }
}
