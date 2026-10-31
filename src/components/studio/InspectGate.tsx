"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, Dialog, InlineStatus } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { memoryVerdict, openInspect, userClick, type InspectResult, type InspectSession, type UserClick } from "@/sim-host/engines/inspect";
import { loadEngine } from "@/sim-host/engines/loader";
import type { FidelityT } from "./TierChips";

export interface InspectGateProps {
  source: string;
  onResult(result: InspectResult): void;
  /** Gigabytes the browser reports; read from the browser when left out. */
  deviceMemory?: number;
  lang: Locale;
  messages: Messages["fidelity"];
}

type Sizes = { wireBytes: number; rawBytes: number };

type Phase =
  | { name: "closed" }
  | { name: "gate"; sizes: Sizes | null }
  | { name: "loading"; sizes: Sizes }
  | { name: "elaborating"; sizes: Sizes; loadMs: number }
  | { name: "result"; sizes: Sizes; loadMs: number; result: InspectResult }
  | { name: "failed"; detail: string };

/** Chromium's renderer peaked between 662 and 725 MB with Yosys loaded (RS-12). */
const PEAK_MEMORY_BYTES = 700_000_000;

const megabytes = (bytes: number): string => `${(bytes / 1_000_000).toFixed(bytes < 100_000_000 ? 1 : 0)} MB`;

function reportedMemory(): number | undefined {
  return (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
}

export function InspectGate({ source, onResult, deviceMemory, lang, messages }: InspectGateProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/fidelity`), [lang, messages]);
  const [phase, setPhase] = useState<Phase>({ name: "closed" });
  const session = useRef<InspectSession | null>(null);
  const started = useRef(false);
  const cancelled = useRef(false);

  const open = phase.name !== "closed";
  const verdict = memoryVerdict(deviceMemory ?? (open ? reportedMemory() : undefined));
  const refused = verdict.kind === "refuse";

  useEffect(() => () => session.current?.dispose(), []);

  function close() {
    cancelled.current = true;
    started.current = false;
    session.current?.dispose();
    session.current = null;
    setPhase({ name: "closed" });
  }

  async function showGate() {
    cancelled.current = false;
    setPhase({ name: "gate", sizes: null });
    const offer = await loadEngine("yosys");
    if (cancelled.current) return;
    if (!offer.ok) setPhase({ name: "failed", detail: offer.detail });
    else setPhase({ name: "gate", sizes: { wireBytes: offer.wireBytes, rawBytes: offer.rawBytes } });
  }

  async function start(click: UserClick, sizes: Sizes) {
    if (started.current) return;
    started.current = true;
    setPhase({ name: "loading", sizes });
    const begin = performance.now();
    const opened = await openInspect(click, { loadEngine, now: () => performance.now() });
    if (!opened.ok) {
      started.current = false;
      if (!cancelled.current) setPhase({ name: "failed", detail: opened.detail });
      return;
    }
    if (cancelled.current) {
      opened.session.dispose();
      return;
    }
    session.current = opened.session;
    const loadMs = Math.round(performance.now() - begin);
    setPhase({ name: "elaborating", sizes, loadMs });
    const result = await opened.session.elaborate(source);
    if (cancelled.current) return;
    onResult(result);
    setPhase({ name: "result", sizes, loadMs, result });
  }

  const sizes = phase.name === "gate" || phase.name === "loading" || phase.name === "elaborating" || phase.name === "result" ? phase.sizes : null;
  const busy = phase.name === "loading" || phase.name === "elaborating";

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => void showGate()}>
        {t("inspect.title")}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t("inspect.title")}
        description={t("inspect.intro")}
        closeLabel={t("inspect.cancel")}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t("inspect.cancel")}
            </Button>
            {!refused && (phase.name === "gate" || phase.name === "loading") ? (
              <Button
                variant="primary"
                busy={phase.name === "loading"}
                disabled={!sizes}
                onClick={(event) => {
                  const click = userClick(event.nativeEvent);
                  if (click && sizes) void start(click, sizes);
                }}
              >
                {phase.name === "loading" ? t("inspect.loading") : t("inspect.load")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {refused ? <Callout tone="warn">{t("inspect.refuse")}</Callout> : null}
          {!refused && verdict.gb === null && phase.name === "gate" ? <Callout tone="note">{t("inspect.unknown")}</Callout> : null}
          {sizes ? (
            <ul className="flex flex-col gap-1 text-sm tabular-nums">
              <li>{t("inspect.size", { wire: megabytes(sizes.wireBytes), raw: megabytes(sizes.rawBytes) })}</li>
              <li>{t("inspect.memory", { peak: megabytes(PEAK_MEMORY_BYTES) })}</li>
            </ul>
          ) : null}
          {phase.name === "failed" ? (
            <InlineStatus tone="bad" live>
              {t("inspect.failed")}: {phase.detail}
            </InlineStatus>
          ) : null}
          {phase.name === "result" ? <ResultLines phase={phase} t={t} /> : null}
          {busy ? <span className="sr-only" role="status">{t("inspect.loading")}</span> : null}
        </div>
      </Dialog>
    </>
  );
}

function ResultLines({ phase, t }: { phase: Extract<Phase, { name: "result" }>; t: FidelityT }) {
  const { result } = phase;
  if (!result.ok) {
    return (
      <InlineStatus tone="bad" live>
        {result.error}
      </InlineStatus>
    );
  }
  const cells = Object.values(result.cells).reduce((sum, n) => sum + n, 0);
  return (
    <div className="flex flex-col gap-2">
      <InlineStatus tone="good" live>
        {t("inspect.result", { cells, wires: result.nets })}
      </InlineStatus>
      <ul className="flex flex-col gap-1 font-mono text-sm tabular-nums text-muted">
        {Object.entries(result.cells).map(([type, count]) => (
          <li key={type}>
            {type} {count}
          </li>
        ))}
      </ul>
      {result.implicitWires.map((wire) => (
        <InlineStatus key={`${wire.line}:${wire.name}`} tone="warn">
          {wire.line}: {wire.name}. {t("inspect.lint.implicitWire")}
        </InlineStatus>
      ))}
      <p className="font-mono text-xs tabular-nums text-muted">
        {phase.loadMs} ms, {result.ms} ms
      </p>
    </div>
  );
}
