"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { RunClientState } from "@/collab/run";
import { Button, Callout, Chip, Icon, type CalloutTone, type ChipTone } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { RunState } from "@/protocol";
import type { StepUnit } from "@/sim/engine";
import { registerCommand } from "@/studio/commands";
import type { RobotStore } from "@/studio/robot/store";
import { useStoreSelector } from "@/studio/stores/select";
import type { RunPhase, RunStore } from "@/studio/stores/run";
import { useEditAccess } from "./room/RoomDock";
import { SpeedControl } from "./SpeedControl";
import { getRunTarget, subscribeRunTarget, type SimLink } from "./wiring/simLink";

export interface RunBarProps {
  run: RunStore;
  link: SimLink;
  messages: Messages["studioRun"];
  instruments: Messages["instruments"];
  roomRun: Messages["run"];
  lang: Locale;
  /** The Interpreter / Firmware control, when the project has a board it can apply to. */
  firmware?: ReactNode;
  /** The Build control and its status, when the project has firmware a server could compile. */
  compile?: ReactNode;
  /** The robot's results, when the project is a robot: the hash of the finished run is shown. */
  robot?: { store: RobotStore; messages: Messages["robot"] };
}

const PHASE_TONE: Record<RunPhase, ChipTone> = {
  idle: "neutral",
  starting: "info",
  running: "good",
  paused: "info",
  stopped: "neutral",
  done: "neutral",
  error: "bad",
  limit: "warn",
  killed: "warn",
};

const NOTE_TONE: Partial<Record<RunPhase, CalloutTone>> = { error: "danger", limit: "warn", killed: "warn" };

const SHARED_PHASE: Record<RunState["state"], RunPhase> = { idle: "idle", running: "running", paused: "paused", halted: "stopped", done: "done" };

const sharedPhase = (s: RunClientState): RunPhase => SHARED_PHASE[s.run.state];

const NO_UPDATES = () => () => {};

/** The room's run while the controls belong to it; null with no room or on a private run. */
function useSharedRun(): RunClientState | null {
  const wiring = useSyncExternalStore(subscribeRunTarget, getRunTarget, () => null);
  const state = useSyncExternalStore(wiring?.store.subscribe ?? NO_UPDATES, () => wiring?.store.get() ?? null, () => null);
  return state && state.status !== "detached-own" ? state : null;
}

function livePhase(run: RunStore): RunPhase {
  const state = getRunTarget()?.client.state;
  return state && state.status !== "detached-own" ? sharedPhase(state) : run.getState().phase;
}

const STEP_UNITS: readonly StepUnit[] = ["ns", "event", "statement", "line", "cycle"];

/** One press is one unit; a nanosecond is too small to see, so `ns` steps a microsecond. */
const STEP_COUNT: Record<StepUnit, number> = { ns: 1000, event: 1, statement: 1, line: 1, cycle: 1 };

function Clock({ run, label }: { run: RunStore; label: string }) {
  const tNs = useStoreSelector(run, (s) => s.tNs);
  return (
    <span className="font-mono text-sm tabular-nums text-muted" role="timer" aria-label={label}>
      {(tNs / 1e9).toFixed(3)} s
    </span>
  );
}

function RunHash({ store, messages, lang }: { store: RobotStore; messages: Messages["robot"]; lang: Locale }) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/robot`), [lang, messages]);
  const hash = useSyncExternalStore(store.subscribe, () => store.get().runHash, () => null);
  if (hash === null) return null;
  return (
    <p className="font-mono text-sm tabular-nums text-muted" role="status">
      {t("run.hash", { hash })}
    </p>
  );
}

export function RunBar({ run, link, messages, instruments, roomRun, lang, firmware, compile, robot }: RunBarProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioRun`), [lang, messages]);
  const ti = useMemo(() => createTranslator(lang, instruments, `${lang}/instruments`), [lang, instruments]);
  const tr = useMemo(() => createTranslator(lang, roomRun, `${lang}/run`), [lang, roomRun]);
  const shared = useSharedRun();
  const access = useEditAccess();
  const denied = shared !== null && access.mode === "readonly";
  const [unit, setUnit] = useState<StepUnit>("statement");
  const speed = useStoreSelector(run, (s) => s.speed);
  const localAchieved = useStoreSelector(run, (s) => s.achievedSpeed);
  const localPhase = useStoreSelector(run, (s) => s.phase);
  const stale = useStoreSelector(run, (s) => s.stale);
  const localBehind = useStoreSelector(run, (s) => s.behindReal);
  const phase = shared ? sharedPhase(shared) : localPhase;
  const achieved = shared ? shared.achievedSpeed : localAchieved;
  const behind = shared ? shared.role === "runner" && shared.behindReal : localBehind;
  const limit = useStoreSelector(run, (s) => s.limit?.which ?? null);
  const firstError = useStoreSelector(run, (s) => s.diagnostics.find((d) => d.severity === "error")?.text ?? null);

  useEffect(() => {
    const offs = [
      registerCommand({
        id: "sim.run",
        labelKey: "studioRun.commands.run",
        keys: ["Mod+Enter"],
        scope: "sim",
        enabled: () => run.getState().phase !== "starting",
        run: () => void link.run(),
      }),
      registerCommand({
        id: "sim.stop",
        labelKey: "studioRun.commands.stop",
        scope: "sim",
        enabled: () => ["starting", "running", "paused"].includes(livePhase(run)),
        run: () => link.stop(),
      }),
      registerCommand({
        id: "sim.reset",
        labelKey: "studioRun.commands.reset",
        scope: "sim",
        enabled: () => livePhase(run) !== "idle",
        run: () => link.reset(),
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [run, link]);

  const active = phase === "starting" || phase === "running" || phase === "paused";
  const restart = stale && phase !== "idle";
  const note = NOTE_TONE[phase];
  const noteText =
    phase === "limit" && limit ? t(`limit.${limit}`) : phase === "killed" ? t("killed") : phase === "error" ? (firstError ?? t("noDetail")) : null;

  return (
    <div className="flex flex-col gap-2">
      <div role="toolbar" aria-label={t("bar.label")} className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={denied || phase === "starting"} aria-keyshortcuts="Control+Enter Meta+Enter" onClick={() => void link.run()}>
          <Icon name={restart ? "refresh" : "play"} size={16} />
          {restart ? t("bar.restart") : t("bar.run")}
        </Button>
        <Button variant="secondary" size="sm" disabled={denied || !active} onClick={() => link.stop()}>
          <Icon name="stop" size={16} />
          {t("bar.stop")}
        </Button>
        <Button variant="ghost" size="sm" disabled={denied || phase === "idle"} onClick={() => link.reset()}>
          <Icon name="reset" size={16} />
          {t("bar.reset")}
        </Button>
        {phase === "paused" ? (
          <Button variant="secondary" size="sm" disabled={denied} onClick={() => link.resume()}>
            <Icon name="play" size={16} />
            {ti("run.resume")}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled={denied || phase !== "running"} onClick={() => link.pause()}>
            {ti("run.pause")}
          </Button>
        )}
        <Button variant="secondary" size="sm" disabled={denied || phase !== "paused"} onClick={() => link.step(unit, STEP_COUNT[unit])}>
          {ti("run.step")}
        </Button>
        <select
          disabled={denied}
          aria-label={ti("run.stepUnit")}
          value={unit}
          onChange={(e) => setUnit(e.target.value as StepUnit)}
          className="rounded-lg bg-sunken px-2 py-2 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {STEP_UNITS.map((u) => (
            <option key={u} value={u} disabled={u === "cycle"}>
              {u === "cycle" ? `${ti("run.unit.cycle")} (${ti("run.cycleNeedsFirmware")})` : ti(`run.unit.${u}`)}
            </option>
          ))}
        </select>
        <Chip tone={PHASE_TONE[phase]} dot role="status">
          {t(`phase.${phase}`)}
        </Chip>
        <Clock run={run} label={t("bar.time")} />
      </div>
      {firmware}
      {compile}
      {robot ? <RunHash store={robot.store} messages={robot.messages} lang={lang} /> : null}
      <fieldset disabled={denied} className="m-0 min-w-0 border-0 p-0">
        <SpeedControl t={ti} speed={speed} achieved={achieved} behind={behind && phase === "running"} onChange={(x) => link.setSpeed(x)} />
      </fieldset>
      {denied ? (
        <p className="text-sm text-muted" role="status">
          {tr("controlDenied")}
        </p>
      ) : null}
      {restart ? (
        <p className="text-sm text-muted" role="status">
          {t("bar.stale")}
        </p>
      ) : null}
      {note && noteText ? (
        <Callout tone={note} live>
          {noteText}
        </Callout>
      ) : null}
    </div>
  );
}
