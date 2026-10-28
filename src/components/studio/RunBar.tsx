"use client";

import { useEffect, useMemo } from "react";
import { Button, Callout, Chip, Icon, type CalloutTone, type ChipTone } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { registerCommand } from "@/studio/commands";
import { useStoreSelector } from "@/studio/stores/select";
import type { RunPhase, RunStore } from "@/studio/stores/run";
import type { SimLink } from "./wiring/simLink";

export interface RunBarProps {
  run: RunStore;
  link: SimLink;
  messages: Messages["studioRun"];
  lang: Locale;
}

const PHASE_TONE: Record<RunPhase, ChipTone> = {
  idle: "neutral",
  starting: "info",
  running: "good",
  stopped: "neutral",
  done: "neutral",
  error: "bad",
  limit: "warn",
  killed: "warn",
};

const NOTE_TONE: Partial<Record<RunPhase, CalloutTone>> = { error: "danger", limit: "warn", killed: "warn" };

function Clock({ run, label }: { run: RunStore; label: string }) {
  const tNs = useStoreSelector(run, (s) => s.tNs);
  return (
    <span className="font-mono text-sm tabular-nums text-muted" role="timer" aria-label={label}>
      {(tNs / 1e9).toFixed(3)} s
    </span>
  );
}

export function RunBar({ run, link, messages, lang }: RunBarProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioRun`), [lang, messages]);
  const phase = useStoreSelector(run, (s) => s.phase);
  const stale = useStoreSelector(run, (s) => s.stale);
  const behind = useStoreSelector(run, (s) => s.behindReal);
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
        enabled: () => ["starting", "running"].includes(run.getState().phase),
        run: () => link.stop(),
      }),
      registerCommand({
        id: "sim.reset",
        labelKey: "studioRun.commands.reset",
        scope: "sim",
        enabled: () => run.getState().phase !== "idle",
        run: () => link.reset(),
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [run, link]);

  const active = phase === "starting" || phase === "running";
  const restart = stale && phase !== "idle";
  const note = NOTE_TONE[phase];
  const noteText =
    phase === "limit" && limit ? t(`limit.${limit}`) : phase === "killed" ? t("killed") : phase === "error" ? (firstError ?? t("noDetail")) : null;

  return (
    <div className="flex flex-col gap-2">
      <div role="toolbar" aria-label={t("bar.label")} className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={phase === "starting"} aria-keyshortcuts="Control+Enter Meta+Enter" onClick={() => void link.run()}>
          <Icon name={restart ? "refresh" : "play"} size={16} />
          {restart ? t("bar.restart") : t("bar.run")}
        </Button>
        <Button variant="secondary" size="sm" disabled={!active} onClick={() => link.stop()}>
          <Icon name="stop" size={16} />
          {t("bar.stop")}
        </Button>
        <Button variant="ghost" size="sm" disabled={phase === "idle"} onClick={() => link.reset()}>
          <Icon name="reset" size={16} />
          {t("bar.reset")}
        </Button>
        <Chip tone={PHASE_TONE[phase]} dot role="status">
          {t(`phase.${phase}`)}
        </Chip>
        <Clock run={run} label={t("bar.time")} />
      </div>
      {restart ? (
        <p className="text-sm text-muted" role="status">
          {t("bar.stale")}
        </p>
      ) : null}
      {behind && phase === "running" ? <p className="text-sm text-warn">{t("bar.behind")}</p> : null}
      {note && noteText ? (
        <Callout tone={note} live>
          {noteText}
        </Callout>
      ) : null}
    </div>
  );
}
