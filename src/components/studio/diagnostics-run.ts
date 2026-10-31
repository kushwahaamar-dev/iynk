import { cryptoRandom } from "@/core/ids";
import { writeIynk } from "@/export/iynk";
import type { PartRegistry } from "@/parts/registry";
import type { Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { sampleBlinkD12 } from "@/project/samples";
import { createSession } from "@/project/session";
import { validateValue } from "@/project/validate";
import type { ProjectHost } from "@/local/project-host";
import type { ProjectEv } from "@/local/project-protocol";
import { buildSimNetlist, type SimNetlist } from "@/sim-host";
import type { SimHost } from "@/sim-host/host";
import type { SimEv, SimRunState } from "@/sim-host/protocol";
import type { ProgramImage, SimDiagnostic, SimRunOptions } from "@/sim/engine";

export interface DiagDeps {
  sim: SimHost;
  project: ProjectHost;
  /** A second sim host whose worker answers `diag stall`; `stall` busy-loops its current worker. */
  diagSim(): { host: SimHost; stall(): void };
  reg: Pick<PartRegistry, "get">;
  wallMs(): number;
  frames: { maxGapMs(): number };
}

export type ProbeName = "list-repeat" | "bytearray-loop" | "c-array" | "string-double" | "endless-loop";

const NS_PER_MS = 1_000_000;
const STEP_NS = 50 * NS_PER_MS;
const SAMPLE_SECONDS = 5;
const SAVE_COMMITS = 30;
const RUN_WAIT_MS = 30_000;
const STALL_WAIT_MS = 10_000;
const LIMITS = { statements: 4_000_000, events: 100_000, outputBytes: 65_536 };
const TERMINAL: readonly SimRunState[] = ["done", "halted", "limit"];
const KILL_REASONS = ["wall-stall", "cancel-unanswered"];

const PROBES: Record<ProbeName, { board: "uno-r3" | "pico"; language: "arduino-cpp" | "python"; path: string; text: string }> = {
  "list-repeat": { board: "pico", language: "python", path: "main.py", text: "x = [0] * 10**9\n" },
  "bytearray-loop": { board: "pico", language: "python", path: "main.py", text: "keep = []\nwhile True:\n    keep.append(bytearray(900000))\n" },
  "c-array": { board: "uno-r3", language: "arduino-cpp", path: "main.ino", text: "int a[2000000000];\nvoid setup() {}\nvoid loop() {}\n" },
  "string-double": { board: "uno-r3", language: "arduino-cpp", path: "main.ino", text: 'void setup() { String s = "ab"; while (true) { s += s; } }\nvoid loop() {}\n' },
  "endless-loop": { board: "uno-r3", language: "arduino-cpp", path: "main.ino", text: "void setup() {}\nvoid loop() { while (true) {} }\n" },
};

interface Sample {
  doc: Project;
  net: SimNetlist;
  program: ProgramImage;
  ledId: string | null;
}

interface Capture {
  serial: string;
  ledEdges: number;
  ledOnMs: number;
  traceHash: string;
  end: Extract<SimEv, { t: "state" }> | null;
  loadError: string | null;
}

const messageOf = (d: SimDiagnostic): string => String(d.args?.message ?? d.text_key);

/** Two FNV-1a lanes over the text, 16 hex digits. Enough to tell two runs apart; not a security hash. */
function fingerprint(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

function options(endNs: number, speed: number): SimRunOptions {
  return { seed: 1, speed, limits: LIMITS, tier: "T1", endNs };
}

function sample(reg: DiagDeps["reg"]): Sample {
  const report = validateValue(sampleBlinkD12());
  if (!report.ok || !report.doc) throw new Error("The sample project does not validate");
  const doc = report.doc;
  const firmware = doc.sources.find((s) => s.role === "firmware" && s.language === "arduino-cpp");
  if (!firmware) throw new Error("The sample project has no Arduino source");
  const { net } = buildSimNetlist(doc, reg);
  const program: ProgramImage = { kind: "source", language: "arduino-cpp", files: [{ path: firmware.path, text: firmware.content }], entry: firmware.path };
  return { doc, net, program, ledId: net.parts.find((p) => p.kind === "led")?.id ?? null };
}

function bareNet(board: "uno-r3" | "pico"): SimNetlist {
  return {
    version: 1,
    docHash: "diagnostics",
    nets: [{ id: "GND" }],
    ground: "GND",
    parts: [{ id: "u1", descriptor: board, params: {}, pins: {}, kind: "board" }],
    settings: { seed: 1, toleranceMode: "nominal", analog: { mode: "dc-event", stepNs: 1000 }, speed: 0 },
  };
}

const loadFailure = (diagnostics: SimDiagnostic[]): string | null => {
  const found = diagnostics.find((d) => d.severity === "error");
  return found ? messageOf(found) : null;
};

/** Loads the sample and steps it in 50 ms pieces so every LED change shows in a frame. */
async function captureRun(sim: SimHost, s: Sample, seconds: number): Promise<Capture> {
  const frames: Extract<SimEv, { t: "frame" }>[] = [];
  let end: Capture["end"] = null;
  const off = sim.onEvent((ev) => {
    if (ev.t === "frame") frames.push(ev);
    else if (ev.t === "state" && TERMINAL.includes(ev.state)) end = ev;
  });
  try {
    const endNs = seconds * 1000 * NS_PER_MS;
    const { diagnostics } = await sim.load(s.net, options(endNs, 0), s.program);
    const loadError = loadFailure(diagnostics);
    for (let left = Math.ceil(endNs / STEP_NS) + 2; !end && !loadError && left > 0; left--) await sim.step("ns", STEP_NS);

    let lit = false;
    let edges = 0;
    let onNs = 0;
    let previousAt = 0;
    for (const frame of frames) {
      if (lit) onNs += frame.at - previousAt;
      previousAt = frame.at;
      const led = frame.parts.find((p) => p.kind === "led" && p.part === s.ledId);
      if (led?.kind === "led" && led.lit !== lit) {
        lit = led.lit;
        edges++;
      }
    }
    const traceHash = fingerprint(frames.map((f) => `${f.at}|${JSON.stringify(f.pins)}|${JSON.stringify(f.parts)}|${JSON.stringify(f.serial)}`).join("\n"));
    const serial = frames.flatMap((f) => f.serial.map((l) => l.text)).join("");
    return { serial, ledEdges: edges, ledOnMs: Math.round(onNs / NS_PER_MS), traceHash, end, loadError };
  } finally {
    off();
  }
}

function limitOf(c: Capture): string | null {
  if (c.loadError) return c.loadError;
  return c.end?.state === "limit" ? (c.end.limit?.message ?? "limit") : null;
}

export async function runSample(d: DiagDeps, seconds = SAMPLE_SECONDS) {
  const s = sample(d.reg);
  const imported = await d.project.files.importBytes(writeIynk(s.doc), "uno-blink-d12.iynk");
  if (!imported.ok) throw new Error(`The sample file was refused: ${imported.error.message}`);
  const c = await captureRun(d.sim, s, seconds);
  return { serial: c.serial, ledEdges: c.ledEdges, ledOnMs: c.ledOnMs, traceHash: c.traceHash, limit: limitOf(c) };
}

export async function runTen(d: DiagDeps) {
  const s = sample(d.reg);
  const hashes: string[] = [];
  for (let i = 0; i < 10; i++) hashes.push((await captureRun(d.sim, s, SAMPLE_SECONDS)).traceHash);
  const wrong = hashes.findIndex((h) => h !== hashes[0]);
  return {
    equal: hashes.filter((h) => h === hashes[0]).length,
    of: 10 as const,
    firstDiff: wrong < 0 ? null : `run ${wrong + 1} gave ${hashes[wrong]}, run 1 gave ${hashes[0]}`,
  };
}

/** Waits for the run to end, or null when it does not within `ms`. */
function endOf(sim: SimHost, ms: number): { wait: Promise<Extract<SimEv, { t: "state" }> | null>; stop(): void } {
  let stop = () => undefined as void;
  const wait = new Promise<Extract<SimEv, { t: "state" }> | null>((resolve) => {
    const off = sim.onEvent((ev) => {
      if (ev.t === "state" && TERMINAL.includes(ev.state)) resolve(ev);
    });
    const timer = setTimeout(() => resolve(null), ms);
    stop = () => {
      off();
      clearTimeout(timer);
    };
  });
  return { wait, stop };
}

async function workerAnswers(d: DiagDeps): Promise<boolean> {
  try {
    const c = await captureRun(d.sim, sample(d.reg), 0.1);
    return c.end?.state === "done";
  } catch {
    return false;
  }
}

export async function runProbe(d: DiagDeps, which: ProbeName) {
  const probe = PROBES[which];
  const program: ProgramImage = { kind: "source", language: probe.language, files: [{ path: probe.path, text: probe.text }], entry: probe.path };
  const started = d.wallMs();
  const watcher = endOf(d.sim, RUN_WAIT_MS);
  let ended: "limit" | "run-length" | "killed";
  let message: string;
  try {
    const { diagnostics } = await d.sim.load(bareNet(probe.board), options(SAMPLE_SECONDS * 1000 * NS_PER_MS, 0), program);
    const failure = loadFailure(diagnostics);
    if (failure) {
      ended = "limit";
      message = failure;
    } else {
      await d.sim.control("run");
      const end = await watcher.wait;
      if (!end) throw new Error("The run did not end within 30 seconds");
      const reason = end.limit;
      ended = end.state !== "limit" ? "run-length" : KILL_REASONS.includes(reason?.kind ?? "") ? "killed" : "limit";
      message = reason?.message ?? "";
    }
  } finally {
    watcher.stop();
  }
  const ms = Math.round(d.wallMs() - started);
  return { ended, message, workerAnswers: await workerAnswers(d), ms };
}

export async function runStall(d: DiagDeps) {
  const s = sample(d.reg);
  const { host, stall } = d.diagSim();
  const watcher = endOf(host, STALL_WAIT_MS);
  try {
    await host.load(s.net, options(60_000 * NS_PER_MS, 1), s.program);
    await host.control("run");
    const started = d.wallMs();
    stall();
    const end = await watcher.wait;
    if (end?.state !== "limit" || !KILL_REASONS.includes(end.limit?.kind ?? "")) throw new Error("The stalled worker was not stopped");
    const killedInMs = Math.round(d.wallMs() - started);
    await host.control("stop");
    return { killedInMs, restartedInMs: Math.round(d.wallMs() - started), maxFrameGapMs: Math.round(d.frames.maxGapMs()) };
  } finally {
    watcher.stop();
    await host.kill();
  }
}

async function killSim(d: DiagDeps) {
  const s = sample(d.reg);
  const before = await captureRun(d.sim, s, 1);
  const started = d.wallMs();
  await d.sim.kill();
  await d.sim.restart();
  const after = await captureRun(d.sim, s, 1);
  return { recoveredMs: Math.round(d.wallMs() - started), hashBefore: before.traceHash, hashAfter: after.traceHash };
}

const fixedClock = (doc: Project) => {
  let ms = Date.parse(doc.meta.updatedAt);
  return () => (ms += 1000);
};

function savedAfter(project: ProjectHost, start: () => Promise<void>): Promise<Extract<ProjectEv, { t: "saved" }>> {
  return new Promise((resolve, reject) => {
    const off = project.onEvent((ev) => {
      if (ev.t === "saved") {
        off();
        resolve(ev);
      } else if (ev.t === "save_failed") {
        off();
        reject(new Error(`The save failed: ${ev.detail}`));
      }
    });
    start().catch((err: unknown) => {
      off();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

async function killProject(d: DiagDeps) {
  const doc = sample(d.reg).doc;
  const session = createSession({ state: doc, clock: fixedClock(doc), rnd: cryptoRandom });
  await d.project.open(doc.id, doc, doc.revision);
  const before = session.revision;
  const applied = session.apply({ k: "meta.set", set: { title: `${doc.meta.title} (kill test)` } }, { actor: doc.access.owners[0], kind: "user" });
  if (!applied.ok) throw new Error(applied.message);
  await d.project.commit(before, session.revision, session.state.history.ops.filter((e) => e.seq > before));
  const hashBefore = stateHash(session.state);
  const started = d.wallMs();
  await d.project.kill();
  const saved = await savedAfter(d.project, () => d.project.save("manual"));
  await d.project.close(doc.id);
  return { recoveredMs: Math.round(d.wallMs() - started), hashBefore, hashAfter: saved.hash };
}

export function runKill(d: DiagDeps, which: "sim" | "project") {
  return which === "sim" ? killSim(d) : killProject(d);
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

export async function runSaveSpeed(d: DiagDeps, doc: Project, commits = SAVE_COMMITS) {
  const session = createSession({ state: doc, clock: fixedClock(doc), rnd: cryptoRandom });
  const author = { actor: doc.access.owners[0], kind: "user" as const };
  await d.project.open(doc.id, doc, doc.revision);
  const times: number[] = [];
  for (let i = 0; i < commits; i++) {
    const before = session.revision;
    const started = d.wallMs();
    const applied = session.apply({ k: "meta.set", set: { title: `Save speed ${i + 1}` } }, author);
    if (!applied.ok) throw new Error(applied.message);
    await d.project.commit(before, session.revision, session.state.history.ops.filter((e) => e.seq > before));
    await savedAfter(d.project, () => d.project.save("manual"));
    times.push(d.wallMs() - started);
  }
  await d.project.close(doc.id);
  const sorted = times.toSorted((a, b) => a - b);
  return { p50: Math.round(percentile(sorted, 0.5) * 10) / 10, p95: Math.round(percentile(sorted, 0.95) * 10) / 10, samples: sorted.length };
}

export async function runLessonCheck(d: DiagDeps, count: 5) {
  const [{ boardLoaders }, { defaultParams, renderTemplate, resolveText }, { lessonJob, runChecks }] = await Promise.all([
    import("@/content/index.generated"),
    import("@/lib/boardlab/template"),
    import("@/lib/interp"),
  ]);
  const board = (await boardLoaders["uno-r3"]?.())?.default;
  if (!board) throw new Error("The Uno lessons are not available");
  const lessons = board.lessons.slice(0, count);
  let equal = 0;
  for (const lesson of lessons) {
    const code = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, (key) => key);
    const job = lessonJob(board, lesson, code);
    if (JSON.stringify(await d.sim.check(job)) === JSON.stringify(runChecks(job))) equal++;
  }
  return { equal, of: lessons.length };
}
