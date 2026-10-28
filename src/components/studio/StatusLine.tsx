"use client";

import { useMemo } from "react";
import { Chip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { SceneStatus } from "@/studio/engine/controller";
import type { RunView } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import type { Store } from "@/studio/stores/select";
import type { SessionState } from "@/studio/stores/session";
import type { UiState } from "@/studio/stores/ui";

export interface StatusLineProps {
  status: Store<SceneStatus>;
  session: Store<SessionState>;
  run: Store<RunView>;
  ui: Store<UiState>;
  messages: Messages["studio"];
  /** Phase names and the slow run note come from the run bar's strings. */
  runMessages: Messages["studioRun"];
  lang: Locale;
}

const oneDecimal = (n: number): string => n.toFixed(1);

export function StatusLine({ status, session, run, ui, messages, runMessages, lang }: StatusLineProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const tRun = useMemo(() => createTranslator(lang, runMessages, `${lang}/studioRun`), [lang, runMessages]);
  const phase = useStoreSelector(run, (s) => s.phase);
  const tNs = useStoreSelector(run, (s) => s.tNs);
  const behind = useStoreSelector(run, (s) => s.behindReal);
  const cursor = useStoreSelector(status, (s) => s.cursorMm, (a, b) => a?.x === b?.x && a?.y === b?.y);
  const zoom = useStoreSelector(status, (s) => s.zoom);
  const scene = useStoreSelector(status, (s) => s.scene);
  const selected = useStoreSelector(session, (s) => s.selection.length);
  const gridOn = useStoreSelector(ui, (s) => s.gridOn);
  const snapMm = useStoreSelector(ui, (s) => s.snapMm);

  return (
    <div
      role="group"
      aria-label={t("canvas.status.label")}
      aria-live="off"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule bg-sunken px-4 py-2 text-xs text-muted tabular-nums"
    >
      <Chip tone={phase === "running" ? "good" : "neutral"} dot>
        {tRun(`phase.${phase}`)}
      </Chip>
      <span className="font-mono tabular-nums" role="timer" aria-label={tRun("bar.time")}>
        {(tNs / 1e9).toFixed(3)} s
      </span>
      {behind && phase === "running" ? <span className="text-warn">{tRun("bar.behind")}</span> : null}
      {cursor ? (
        <span className="font-mono tabular-nums" title={t("canvas.status.cursor")}>
          {t("canvas.status.cursorValue", { x: oneDecimal(cursor.x), y: oneDecimal(cursor.y) })}
        </span>
      ) : null}
      <span className="font-mono tabular-nums">{t("canvas.status.zoomValue", { value: oneDecimal(zoom) })}</span>
      <span>{gridOn ? t("canvas.status.grid", { step: snapMm }) : t("canvas.status.gridOff")}</span>
      <span>{t("canvas.status.selected", { count: selected })}</span>
      <span className="ms-auto flex gap-4 max-md:hidden">
        <span>{t("canvas.status.scene", { items: scene.items, culled: scene.culled })}</span>
        <span>{t("canvas.status.detail", { low: scene.lod[0], mid: scene.lod[1], high: scene.lod[2] })}</span>
      </span>
    </div>
  );
}
