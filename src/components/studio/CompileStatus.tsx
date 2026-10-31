"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Callout, Icon } from "@/components/ui";
import type { Op } from "@/project/generated/types";
import { FLASH_BYTES, FQBN, type CompileDiagnostic, type CompileResult, type CompileService } from "@/server-client/compile";
import { ClientError, NeedsEnrolment } from "@/server-client/types";
import { imageOps, type RuntimeView } from "./FirmwareMode";
import type { FidelityT } from "./TierChips";

export type SourceView = { path: string; content: string };

export interface CompileStatusProps {
  sources: readonly SourceView[];
  board: keyof typeof FQBN;
  runtime: RuntimeView;
  onImage(ops: Op[]): void;
  service: CompileService | null;
  availability: "yes" | "off" | "no-server";
  t: FidelityT;
}

type Built = { result: CompileResult; key: string };

type State =
  | { kind: "idle" }
  | { kind: "building" }
  | { kind: "ok"; built: Built }
  | { kind: "failed"; diagnostics: CompileDiagnostic[]; note: string | null }
  | { kind: "timeout" };

const RATE_LIMIT_FALLBACK_SECONDS = 60;

const TONE = { error: "text-bad", warning: "text-warn", note: "text-muted" } as const;

/** What the sources said when a build started; a later edit makes the finished build stale. */
const sourceKey = (sources: readonly SourceView[]): string => JSON.stringify(sources.map((s) => [s.path, s.content]));

const baseName = (path: string): string => path.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]/g, "_") || "firmware";

/** The entry file (.ino) goes first, as the compiler expects. */
const entryFirst = (sources: readonly SourceView[]): SourceView[] =>
  [...sources].sort((a, b) => Number(b.path.endsWith(".ino")) - Number(a.path.endsWith(".ino")));

function Messages({ items, t }: { items: readonly CompileDiagnostic[]; t: FidelityT }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {items.map((d, i) => (
        <li key={i} className="flex flex-wrap gap-x-2">
          <span className={`font-semibold ${TONE[d.severity]}`}>{t(`compile.severity.${d.severity}`)}</span>
          {d.file ? (
            <span className="font-mono tabular-nums text-muted">
              {d.file}
              {d.line !== undefined ? `:${d.line}` : ""}
              {d.column !== undefined ? `:${d.column}` : ""}
            </span>
          ) : null}
          <span className="min-w-0 break-words">{d.message}</span>
        </li>
      ))}
    </ul>
  );
}

function failureNote(e: unknown, t: FidelityT): string {
  if (e instanceof NeedsEnrolment) return t("compile.needsSignIn");
  if (e instanceof ClientError) {
    if (e.status === 501) return t("compile.off");
    if (e.status === 503) return t("compile.notReachable");
    if (e.status === 413) return t("compile.tooLarge");
    if (e.status === 429) return t("compile.rateLimited", { seconds: e.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS });
  }
  return t("compile.failed");
}

export function CompileStatus({ sources, board, runtime, onImage, service, availability, t }: CompileStatusProps) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const running = useRef<AbortController | null>(null);

  useEffect(() => () => running.current?.abort(), []);

  if (availability === "no-server") {
    return (
      <Callout variant="quiet">
        {t("compile.noServer")} {t("compile.importInstead")}
      </Callout>
    );
  }
  if (availability === "off") {
    return (
      <Callout variant="quiet">
        {t("compile.off")}. {t("compile.offHint")} {t("compile.importInstead")}
      </Callout>
    );
  }

  const building = state.kind === "building";
  const key = sourceKey(sources);

  async function build(debug: boolean) {
    if (!service || sources.length === 0) return;
    running.current?.abort();
    const abort = new AbortController();
    running.current = abort;
    setState({ kind: "building" });
    try {
      const files = entryFirst(sources).map((s) => ({ path: s.path, text: s.content }));
      const result = await service.compile({ fqbn: FQBN[board], files, libraries: [], debug }, abort.signal);
      if (abort.signal.aborted) return settleAborted(abort);
      if (result.timedOut) setState({ kind: "timeout" });
      else if (!result.ok || result.hex === undefined) setState({ kind: "failed", diagnostics: result.diagnostics, note: null });
      else {
        setState({ kind: "ok", built: { result, key } });
        onImage(imageOps(runtime, baseName(files[0]?.path ?? ""), result.hex, result.elf));
      }
    } catch (e) {
      if (abort.signal.aborted) settleAborted(abort);
      else setState({ kind: "failed", diagnostics: [], note: failureNote(e, t) });
    }
  }

  /** A cancelled build goes back to idle; one replaced by a newer build leaves the newer one's state alone. */
  function settleAborted(abort: AbortController) {
    if (running.current === abort) setState({ kind: "idle" });
  }

  const built = state.kind === "ok" ? state.built : null;
  const flash = built?.result.size;

  return (
    <section aria-label={t("compile.build")} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!service || sources.length === 0} aria-busy={building} onClick={() => void build(false)}>
          <Icon name="tools" size={16} />
          {building ? t("compile.building") : t("compile.build")}
        </Button>
        <Button variant="ghost" size="sm" disabled={!service || sources.length === 0 || building} onClick={() => void build(true)}>
          <Icon name="code" size={16} />
          {t("compile.debugBuild")}
        </Button>
        {building ? (
          <Button variant="ghost" size="sm" onClick={() => running.current?.abort()}>
            {t("compile.cancel")}
          </Button>
        ) : null}
      </div>
      <div role="status" aria-live="polite" className="flex flex-col gap-1 text-sm">
        {built && built.key !== key ? <p className="text-muted">{t("compile.stale")}</p> : null}
        {built ? (
          <p className="tabular-nums">
            {t("compile.ok", { ms: built.result.ms })}
            {flash ? ` · ${t("compile.flash", { flash: flash.flashBytes, max: FLASH_BYTES })}` : ""}
            {built.result.cacheHit ? ` · ${t("compile.cached")}` : ""}
          </p>
        ) : null}
        {state.kind === "failed" ? <p className="font-semibold text-bad">{state.note ?? t("compile.failed")}</p> : null}
        {state.kind === "timeout" ? <p className="font-semibold text-bad">{t("compile.timeout")}</p> : null}
      </div>
      {built ? <Messages items={built.result.diagnostics} t={t} /> : null}
      {state.kind === "failed" ? <Messages items={state.diagnostics} t={t} /> : null}
    </section>
  );
}
