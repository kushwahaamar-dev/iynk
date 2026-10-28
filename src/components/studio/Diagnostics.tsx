"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Button, TextInput } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { saveToFile } from "@/local/files";
import { createProjectHost } from "@/local/project-host";
import { WIPE_PHRASE } from "@/local/wipe";
import { builtinRegistry } from "@/parts/builtin";
import { createRpcPort, type RpcPort, type WorkerLike } from "@/protocol";
import { createSimHost } from "@/sim-host/host";
import type { SimEv, SimReq } from "@/sim-host/protocol";
import {
  runKill,
  runLessonCheck,
  runProbe,
  runSample,
  runSaveSpeed,
  runStall,
  runTen,
  type DiagDeps,
  type ProbeName,
} from "./diagnostics-run";

type Strings = Messages["studio"];

const PROBES: readonly ProbeName[] = ["list-repeat", "bytearray-loop", "c-array", "string-double", "endless-loop"];
const GAP_WINDOW_MS = 5000;
const GAP_REFRESH_MS = 1000;

/** The sim host whose worker answers `diag stall`; the port is kept because the host has no call for it. */
function makeDiagSim(): ReturnType<DiagDeps["diagSim"]> {
  let port: RpcPort<SimReq, SimEv> | null = null;
  const host = createSimHost({
    makePort: () => {
      const worker = new Worker(new URL("../../sim-host/sim.worker.ts", import.meta.url), { type: "module", name: "sim-diag" });
      port = createRpcPort<SimReq, SimEv>(worker as unknown as WorkerLike);
      return port;
    },
  });
  return { host, stall: () => void port?.call({ t: "diag", op: "stall" }).catch(() => undefined) };
}

const gapSamples: { at: number; gap: number }[] = [];
const frames: DiagDeps["frames"] = { maxGapMs: () => gapSamples.reduce((max, s) => Math.max(max, s.gap), 0) };

function useFrameGap() {
  const [gap, setGap] = useState(0);

  useEffect(() => {
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      gapSamples.push({ at: now, gap: now - last });
      last = now;
      while (gapSamples.length > 0 && now - gapSamples[0].at > GAP_WINDOW_MS) gapSamples.shift();
      frame = requestAnimationFrame(tick);
    });
    const refresh = setInterval(() => setGap(Math.round(frames.maxGapMs())), GAP_REFRESH_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(refresh);
      gapSamples.length = 0;
    };
  }, []);

  return gap;
}

let shared: DiagDeps | null = null;

function deps(): DiagDeps {
  shared ??= {
    sim: createSimHost(),
    project: createProjectHost(),
    diagSim: makeDiagSim,
    reg: builtinRegistry(),
    wallMs: () => performance.now(),
    frames,
  };
  return shared;
}

function Row({ label, children, id, result, failed }: { label?: string; children: React.ReactNode; id: string; result: string; failed: boolean }) {
  return (
    <div className="grid gap-2 border-t border-rule py-3 sm:grid-cols-[16rem_1fr] sm:items-start sm:gap-4">
      <div className="min-w-0">{children}</div>
      <p
        data-testid={`diag-${id}`}
        data-failed={failed || undefined}
        aria-live="polite"
        aria-label={label}
        className={`tabular min-h-6 text-sm [overflow-wrap:anywhere] ${failed ? "text-bad" : "text-muted"}`}
      >
        {result}
      </p>
    </div>
  );
}

export function Diagnostics({ strings, lang }: { strings: Strings; lang: Locale }) {
  const t = useMemo(() => createTranslator(lang, strings, `${lang}/studio`), [lang, strings]);
  const gap = useFrameGap();
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { text: string; failed: boolean }>>({});
  const [phrase, setPhrase] = useState("");
  const workers = typeof Worker !== "undefined";

  const show = (id: string, text: string, failed = false) => setResults((all) => ({ ...all, [id]: { text, failed } }));

  async function run(id: string, work: () => Promise<string>) {
    if (busy) return;
    setBusy(id);
    show(id, t("diag.running"));
    try {
      show(id, await work());
    } catch (err) {
      show(id, t("diag.failed", { message: err instanceof Error ? err.message : String(err) }), true);
    } finally {
      setBusy(null);
    }
  }

  const equal = (r: { equal: number; of: number; firstDiff?: string | null }) =>
    r.firstDiff ? t("diag.result.equalFirstDiff", { equal: r.equal, of: r.of, diff: r.firstDiff }) : t("diag.result.equal", { equal: r.equal, of: r.of });

  const killed = (r: { recoveredMs: number; hashBefore: string; hashAfter: string }) =>
    t("diag.result.kill", {
      ms: r.recoveredMs,
      before: r.hashBefore.slice(0, 16),
      after: r.hashAfter.slice(0, 16),
      same: t(r.hashBefore === r.hashAfter ? "diag.result.sameHash" : "diag.result.otherHash"),
    });

  const sample = () =>
    run("sample", async () => {
      const r = await runSample(deps());
      return [
        t("diag.result.sample", { edges: r.ledEdges, onMs: r.ledOnMs, hash: r.traceHash, serial: r.serial ? t("diag.result.serial", { text: r.serial }) : t("diag.result.noSerial") }),
        r.limit ? t("diag.result.limit", { message: r.limit }) : t("diag.result.noLimit"),
      ].join(" ");
    });

  const probe = (which: ProbeName) =>
    run(`probe-${which}`, async () => {
      const r = await runProbe(deps(), which);
      const head =
        r.ended === "limit"
          ? t("diag.result.probeLimit", { ms: r.ms, message: r.message })
          : r.ended === "killed"
            ? t("diag.result.probeKilled", { ms: r.ms, message: r.message })
            : t("diag.result.probeRunLength", { ms: r.ms });
      return `${head} ${t(r.workerAnswers ? "diag.result.answers" : "diag.result.silent")}`;
    });

  const stall = () =>
    run("stall", async () => {
      const r = await runStall(deps());
      return t("diag.result.stall", { killed: r.killedInMs, restarted: r.restartedInMs, gap: r.maxFrameGapMs });
    });

  async function timeSaves(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    await run("save", async () => {
      const host = deps().project;
      const imported = await host.files.importBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      if (!imported.ok) throw new Error(imported.error.message);
      const loaded = await host.load(imported.id);
      if (!loaded.state) throw new Error(file.name);
      const r = await runSaveSpeed(deps(), loaded.state);
      return t("diag.result.saveSpeed", { p50: r.p50, p95: r.p95, samples: r.samples });
    });
    input.value = "";
  }

  const exportAll = () =>
    run("export", async () => {
      const bytes = await deps().project.data.exportAll();
      await saveToFile(bytes, "iynk-export.iynkz");
      return t("diag.result.exported", { size: bytes.length });
    });

  const wipe = () =>
    run("wipe", async () => {
      const report = await deps().project.data.wipe(phrase);
      setPhrase("");
      return report.errors.length > 0
        ? t("diag.result.wipeErrors", { errors: report.errors.join(", ") })
        : t("diag.result.wiped", { stores: report.stores.length, keys: report.localStorageKeys.length });
    });

  const off = !workers || busy !== null;
  const button = (id: string, label: string, onClick: () => void) => (
    <Button size="sm" onClick={onClick} disabled={off} aria-busy={busy === id} className="w-full sm:w-auto">
      {label}
    </Button>
  );
  const row = (id: string, control: React.ReactNode) => (
    <Row key={id} id={id} result={results[id]?.text ?? ""} failed={results[id]?.failed ?? false}>
      {control}
    </Row>
  );

  return (
    <div className="mt-4 flex flex-col gap-8">
      <p className="max-w-[65ch] text-pretty text-sm text-muted">{t("diag.lede")}</p>
      {workers ? null : <p role="alert" className="text-sm text-bad">{t("diag.noWorker")}</p>}
      <p className="tabular text-sm" data-testid="diag-frame-gap">
        <span className="text-muted">{t("diag.frameGap")}: </span>
        <span className="font-semibold">{t("diag.frameGapValue", { ms: gap })}</span>
      </p>

      <section aria-labelledby="diag-sim">
        <h3 id="diag-sim" className="text-base font-semibold">{t("diag.groups.sim")}</h3>
        <div className="mt-2">
          {row("sample", button("sample", t("diag.run.sample"), sample))}
          {row("ten", button("ten", t("diag.run.ten"), () => run("ten", async () => equal(await runTen(deps())))))}
          {PROBES.map((which) => row(`probe-${which}`, button(`probe-${which}`, t(`diag.probe.${which}`), () => probe(which))))}
          {row("stall", button("stall", t("diag.run.stall"), stall))}
          {row("kill-sim", button("kill-sim", t("diag.run.killSim"), () => run("kill-sim", async () => killed(await runKill(deps(), "sim")))))}
          {row("lessons", button("lessons", t("diag.run.lessons"), () => run("lessons", async () => equal(await runLessonCheck(deps(), 5)))))}
        </div>
      </section>

      <section aria-labelledby="diag-project">
        <h3 id="diag-project" className="text-base font-semibold">{t("diag.groups.project")}</h3>
        <div className="mt-2">
          {row("kill-project", button("kill-project", t("diag.run.killProject"), () => run("kill-project", async () => killed(await runKill(deps(), "project")))))}
          {row(
            "save",
            <div>
              <label htmlFor="diag-save-file" className="field-label mb-1 block">{t("diag.save.label")}</label>
              <input
                id="diag-save-file"
                data-testid="diag-save-file"
                type="file"
                accept=".iynk,.iynkz"
                disabled={off}
                aria-describedby="diag-save-hint"
                onChange={(e) => void timeSaves(e)}
                className="block w-full max-w-full text-sm file:me-3 file:rounded-lg file:border file:border-rule file:bg-surface file:px-3 file:py-1 file:font-semibold disabled:opacity-60"
              />
              <p id="diag-save-hint" className="mt-1 text-sm text-muted">{t("diag.save.hint")}</p>
            </div>,
          )}
        </div>
      </section>

      <section aria-labelledby="diag-data">
        <h3 id="diag-data" className="text-base font-semibold">{t("diag.groups.data")}</h3>
        <div className="mt-2">
          {row("export", button("export", t("diag.run.exportAll"), exportAll))}
          {row(
            "wipe",
            <div className="flex flex-col gap-2">
              <TextInput
                label={t("diag.wipe.label", { phrase: WIPE_PHRASE })}
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                data-testid="diag-wipe-phrase"
              />
              <Button size="sm" variant="danger" onClick={wipe} disabled={off || phrase !== WIPE_PHRASE} aria-busy={busy === "wipe"} className="w-full sm:w-auto">
                {t("diag.run.wipe")}
              </Button>
            </div>,
          )}
        </div>
      </section>
    </div>
  );
}
