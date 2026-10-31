// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cryptoRandom } from "@/core/ids";
import { writeIynk } from "@/export/iynk";
import { builtinRegistry } from "@/parts/builtin";
import type { Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { sampleBlinkD12 } from "@/project/samples";
import { createSession } from "@/project/session";
import { validateValue } from "@/project/validate";
import { createInlinePort } from "@/protocol";
import { createInterpEngine } from "@/sim-host/engines/interp-engine";
import { NS_PER_MS } from "@/sim/core/clock";
import { createSimHandler } from "@/sim-host/handler";
import { createSimHost } from "@/sim-host/host";
import type { SimEv } from "@/sim-host/protocol";
import type { SimNetlist, SliceBudget } from "@/sim/engine";
import { createDigitalNets } from "@/sim/digital/nets";
import { buildSimNetlist } from "@/sim/netlist";
import { createOrchestrator } from "@/sim/orchestrator";
import { createRecorder } from "@/sim/replay/record";
import { createProjectHandler } from "./project-handler";
import { createProjectHost, type ProjectHost } from "./project-host";
import type { ProjectEv } from "./project-protocol";
import { createMemoryRepository, emptyRows, type MemoryRows } from "./memory-repository";
import type { Repository } from "./repository";
import { createShadow } from "./shadow";
import { WIPE_PHRASE } from "./wipe";

// The headless walk of the first milestone (FEATURE_PRIORITIZATION 7.2, steps 1, 2, 6, 7 and 8) over the real
// project worker handler and the interpreter engine, with no browser and no network.

const CLOCK = 1_700_000_000_000;
const RUN_NS = 5_000_000_000;
const RUNS = 10;
const LIMITS = { statements: 4_000_000, events: 100_000, outputBytes: 65_536 };
const PROBES = {
  "list-repeat": { board: "pico", language: "python", source: "python", path: "main.py", text: "x = [0] * 10**9\n" },
  "bytearray-loop": { board: "pico", language: "python", source: "python", path: "main.py", text: "keep = []\nwhile True:\n    keep.append(bytearray(900000))\n" },
  "c-array": { board: "uno-r3", language: "arduino", source: "arduino-cpp", path: "main.ino", text: "int a[2000000000];\nvoid setup() {}\nvoid loop() {}\n" },
  "string-double": { board: "uno-r3", language: "arduino", source: "arduino-cpp", path: "main.ino", text: 'void setup() { String s = "ab"; while (true) { s += s; } }\nvoid loop() {}\n' },
} as const;
const BUDGET: SliceBudget = { shouldYield: () => false, work: { statements: Infinity, events: Infinity, outputBytes: Infinity } };

interface Rig {
  rows: MemoryRows;
  repo: Repository;
  host: ProjectHost;
  events: ProjectEv[];
}

function rig(o: { rows?: MemoryRows; degraded?: boolean; wrap?: (repo: Repository) => Repository } = {}): Rig {
  const rows = o.rows ?? emptyRows();
  const repo = o.wrap ? o.wrap(createMemoryRepository({ rows })) : createMemoryRepository({ rows });
  const host = createProjectHost({
    makePort: () => createInlinePort(createProjectHandler({ repo, shadowFactory: createShadow, clock: () => CLOCK, degraded: o.degraded })),
    local: null,
    caches: null,
    sw: null,
  });
  const events: ProjectEv[] = [];
  host.onEvent((ev) => events.push(ev));
  return { rows, repo, host, events };
}

function bareNet(board: string): SimNetlist {
  return {
    version: 1,
    docHash: "walk",
    nets: [{ id: "GND" }],
    ground: "GND",
    parts: [{ id: "u1", descriptor: board, params: {}, pins: {}, kind: "board" }],
    settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 0 },
  };
}

function validSample(): Project {
  const report = validateValue(sampleBlinkD12());
  if (!report.ok || !report.doc) throw new Error("the sample project does not validate");
  return report.doc;
}

function runSample(doc: Project) {
  const firmware = doc.sources.find((s) => s.role === "firmware" && s.language === "arduino-cpp")!;
  const { net } = buildSimNetlist(doc, builtinRegistry());
  const mcu = createInterpEngine({ id: "mcu", board: "uno-r3", language: "arduino", seed: doc.simulation.seed });
  const image = { kind: "source" as const, language: "arduino-cpp" as const, files: [{ path: firmware.path, text: firmware.content }], entry: firmware.path };
  expect(mcu.load(image).ok).toBe(true);
  const digital = createDigitalNets();
  const orch = createOrchestrator({ engines: [mcu], digital });
  const opts = { seed: net.settings.seed, speed: 1, limits: { statements: 4_000_000, events: 100_000, outputBytes: 65_536 }, tier: "T1" as const, endNs: RUN_NS };
  expect(orch.load(net, opts).ok).toBe(true);
  const recorder = createRecorder(orch, { docHash: net.docHash, settings: net.settings, engineVersions: { "engine:interp-arduino": "1.0.0" }, serial: () => mcu.serialLog });
  return { net, orch, digital, finish: () => recorder.finish(orch.now) };
}

const saved = (events: ProjectEv[]) => events.filter((ev): ev is Extract<ProjectEv, { t: "saved" }> => ev.t === "saved");

describe("headless walk of the first milestone", () => {
  const fetchSpy = vi.fn(() => {
    throw new Error("the walk reached for the network");
  });

  beforeAll(() => {
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("step 1: opens with an empty library, no network, and says so when the browser keeps nothing", async () => {
    const { host, events } = rig();
    expect(await host.library.list()).toEqual([]);
    expect(await host.library.trashList()).toEqual([]);
    expect(events.filter((ev) => ev.t === "degraded")).toEqual([]);

    const memoryOnly = rig({ degraded: true });
    await memoryOnly.host.library.list();
    expect(memoryOnly.events).toContainEqual({ t: "degraded", reason: "indexeddb-unavailable" });
  });

  it("step 2: creates a blank Uno project, and refuses a file from a newer version with its bytes intact", async () => {
    const { host, repo } = rig();
    const id = await host.library.create({ board: "uno", title: "Blink" });
    const found = await repo.load(id);
    expect(found.status).toBe("ok");
    if (found.status !== "ok") return;
    const doc = found.rec.doc;
    expect(doc.schemaVersion).toBe("1.1");
    expect(doc.boards.map((b) => b.id)).toEqual(["brd_uno"]);
    expect(doc.views.map((v) => v.id)).toEqual(["vw_bb", "vw_sch"]);
    expect(doc.components).toEqual([]);
    expect(doc.nets).toEqual([]);
    expect(doc.sources.map((s) => s.path)).toEqual(["main.ino"]);
    expect(doc.simulation.seed).toBeTypeOf("number");

    const future = JSON.parse(new TextDecoder().decode(writeIynk(doc))) as { project: { schemaVersion: string } };
    future.project.schemaVersion = "9.0";
    const bytes = new TextEncoder().encode(JSON.stringify(future));
    const refused = await host.files.importBytes(bytes, "future.iynk");
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error.kind).toBe("newer-schema");
    expect(refused.raw).toEqual(bytes);
    expect(await host.library.list()).toHaveLength(1);
  });

  it("step 6: runs the sample ten times to equal hashes, with the LED lit exactly while D12 is high", () => {
    const doc = validSample();
    const first = runSample(doc);
    first.orch.runUntil(RUN_NS, BUDGET);
    const reference = first.finish();
    for (let i = 1; i < RUNS; i++) {
      const again = runSample(doc);
      again.orch.runUntil(RUN_NS, BUDGET);
      const record = again.finish();
      expect(record.serialHash, `serial hash of run ${i + 1}`).toBe(reference.serialHash);
      expect(record.pinTraceHash, `pin trace hash of run ${i + 1}`).toBe(reference.pinTraceHash);
    }

    const led = first.net.parts.find((p) => p.kind === "led")!;
    const d12 = "D12";
    const edges = first.orch.pinEdges().filter((e) => e.net === d12);
    expect(edges.length).toBeGreaterThan(2);

    const watched = runSample(doc);
    let changes = 0;
    let lastLit = false;
    for (let at = NS_PER_MS; at <= RUN_NS; at += NS_PER_MS) {
      watched.orch.runUntil(at, BUDGET);
      const high = watched.orch.pinEdges().filter((e) => e.net === d12 && e.at <= at).at(-1)?.level === 1;
      const state = watched.digital.partStates().find((p) => p.part === led.id);
      const lit = state?.kind === "led" && state.lit;
      expect(lit, `LED at ${at / NS_PER_MS} ms`).toBe(high);
      if (lit !== lastLit) changes++;
      lastLit = lit;
    }
    expect(changes).toBeGreaterThan(2);
  });

  it("step 6: the four probe sketches of SA-10 end at a limit", async () => {
    const endings: Record<string, string> = {};
    for (const [name, probe] of Object.entries(PROBES)) {
      const host = createSimHost({
        makePort: () =>
          createInlinePort(
            createSimHandler({
              diag: false,
              wallMs: () => performance.now(),
              schedule: (fn) => void setTimeout(fn, 0),
              makeEngine: (_program, _net, o) => createInterpEngine({ id: "u1", board: probe.board, language: probe.language, seed: o.seed }),
              makeDigital: createDigitalNets,
            }),
          ),
      });
      const ended = new Promise<Extract<SimEv, { t: "state" }>>((resolve) => {
        host.onEvent((ev) => {
          if (ev.t === "state" && (ev.state === "limit" || ev.state === "done")) resolve(ev);
        });
      });
      const program = { kind: "source" as const, language: probe.source, files: [{ path: probe.path, text: probe.text }], entry: probe.path };
      const { diagnostics } = await host.load(bareNet(probe.board), { seed: 1, speed: 0, limits: LIMITS, tier: "T1", endNs: RUN_NS }, program);
      if (diagnostics.some((d) => d.severity === "error")) {
        endings[name] = "limit";
        continue;
      }
      await host.control("run");
      endings[name] = (await ended).state;
    }
    expect(endings).toEqual({ "list-repeat": "limit", "bytearray-loop": "limit", "c-array": "limit", "string-double": "limit" });
  });

  it("step 7: a saved edit comes back equal after a reload, with nothing to undo, and a full disk keeps the last good copy", async () => {
    const first = rig();
    const id = await first.host.library.create({ board: "uno", title: "Blink" });
    const loaded = await first.host.load(id);
    const doc = loaded.state!;
    const session = createSession({ state: doc, clock: () => CLOCK + 1000, rnd: cryptoRandom });
    await first.host.open(id, doc, doc.revision);
    const author = { actor: doc.access.owners[0], kind: "user" as const };
    for (const title of ["One", "Two", "Three"]) {
      const before = session.revision;
      expect(session.apply({ k: "meta.set", set: { title } }, author).ok).toBe(true);
      await first.host.commit(before, session.revision, session.state.history.ops.filter((e) => e.seq > before));
    }
    await first.host.save("manual");
    const hash = stateHash(session.state);
    expect(saved(first.events).at(-1)?.hash).toBe(hash);

    const second = rig({ rows: first.rows });
    const reloaded = await second.host.load(id);
    expect(reloaded.status).toBe("ok");
    expect(reloaded.hash).toBe(hash);
    expect(stateHash(reloaded.state!)).toBe(hash);
    const resumed = createSession({ state: reloaded.state!, clock: () => CLOCK + 5000, rnd: cryptoRandom });
    expect(resumed.canUndo()).toBe(false);

    const full = rig({
      rows: first.rows,
      wrap: (repo) => ({ ...repo, save: async () => ({ ok: false, kind: "quota", detail: "the disk is full" }) }),
    });
    await full.host.open(id, session.state, session.revision);
    const before = resumed.revision;
    expect(resumed.apply({ k: "meta.set", set: { title: "Four" } }, author).ok).toBe(true);
    await full.host.commit(before, resumed.revision, resumed.state.history.ops.filter((e) => e.seq > before));
    await full.host.save("manual");
    expect(full.events).toContainEqual({ t: "save_failed", kind: "quota", detail: "the disk is full" });
    const kept = await createMemoryRepository({ rows: first.rows }).load(id);
    expect(kept.status === "ok" && kept.rec.hash).toBe(hash);
  });

  it("step 8 and AR-17: an exported file opens equal from the library, from a file, and after all site data is wiped", async () => {
    const source = rig();
    const id = await source.host.library.create({ board: "uno", title: "Blink" });
    const stored = (await source.host.load(id)).state!;
    const hash = stateHash(stored);
    const bytes = await source.host.files.exportProject(id, "iynk");
    expect((await source.host.load(id)).hash).toBe(hash);

    const elsewhere = rig();
    const fromFile = await elsewhere.host.files.importBytes(bytes, "blink.iynk");
    expect(fromFile).toMatchObject({ ok: true, id, hash, hashMatches: true, forked: false });
    expect((await elsewhere.host.load(id)).hash).toBe(hash);

    const report = await source.host.data.wipe(WIPE_PHRASE);
    expect(report.errors).toEqual([]);
    expect(await source.host.library.list()).toEqual([]);
    const restored = await source.host.files.importBytes(bytes, "blink.iynk");
    expect(restored).toMatchObject({ ok: true, id, hash, hashMatches: true });
    expect((await source.host.load(id)).hash).toBe(hash);
  });
});
