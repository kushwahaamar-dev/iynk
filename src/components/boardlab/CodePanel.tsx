"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import type { ParamChip } from "@/content/schema";
import { canRun } from "@/lib/boardlab/engine";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { chipCode, copyText } from "@/lib/boardlab/template";
import { CodeEditor } from "./CodeEditor";
import { useText } from "./text";
import { useLab } from "./useLab";

type Props = {
  store: BoardLabStore;
  /** Chip id -> the figure part it belongs to, for outlining a selected part's chips. */
  chipParts: Record<string, string>;
  onChip: (id: string) => void;
  onRunToggle: () => void;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No Clipboard API (insecure context, old browser): fall back to a hidden textarea.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** "Try it yourself": the editable code, Run/Stop, Reset and Copy, and the compile error. */
export function CodePanel({ store, chipParts, onChip, onRunToggle }: Props) {
  const { t, tc } = useText();
  const titleId = useId();
  const code = useLab(store, (s) => s.code);
  const chips = useLab(store, (s) => s.chips);
  const params = useLab(store, (s) => s.params);
  const values = useLab(store, (s) => s.values);
  const language = useLab(store, (s) => s.language);
  const status = useLab(store, (s) => s.run.status);
  const error = useLab(store, (s) => s.run.error);
  const edited = useLab(store, (s) => s.edited);
  const selected = useLab(store, (s) => s.selected);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const running = status === "running";
  const busy = status === "compiling" || status === "uploading";
  const runnable = canRun(language);
  const selectedChips = selected ? Object.entries(chipParts).filter(([, part]) => part === selected).map(([id]) => id) : [];
  const chipTitle = (id: string) => {
    const chip = params.find((p: ParamChip) => p.id === id);
    if (!chip) return t("code.chip");
    return t("code.chipLabel", { label: tc(chip.label), value: chipCode(chip, values[id] ?? chip.default) });
  };
  const errorText = error && error.kind !== "unsupported" ? (error.line ? t("code.error", { line: error.line, message: error.message }) : t("code.errorNoLine", { message: error.message })) : null;

  return (
    <section aria-labelledby={titleId} className={cx("ink-card flex flex-col gap-3 p-3 sm:p-4", expanded && "lg:col-span-2")} data-testid="code-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={titleId} className="me-auto text-xl">
          {t("code.title")}
          {edited && <span className="ms-2 align-middle text-xs font-semibold uppercase tracking-wide text-muted">{t("code.edited")}</span>}
        </h2>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} aria-pressed={expanded}>
          {expanded ? t("code.collapse") : t("code.expand")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (await copyToClipboard(copyText(store.getState().code))) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={16} aria-hidden="true" />
          <span>{copied ? t("code.copied") : t("code.copy")}</span>
        </Button>
        <Button size="sm" variant="secondary" disabled={!edited || busy} onClick={() => store.dispatch({ type: "code/reset" })} title={t("code.resetTitle")}>
          {t("code.reset")}
        </Button>
        <Button
          size="md"
          variant={running ? "danger" : "primary"}
          onClick={onRunToggle}
          disabled={!runnable}
          aria-busy={busy || undefined}
          title={running ? t("code.stopTitle") : t("code.runTitle")}
          data-testid="run-button"
          className={cx(busy && "animate-pulse motion-reduce:animate-none")}
        >
          {running || busy ? (
            <span aria-hidden="true" className="inline-block size-3 rounded-[2px] bg-current" />
          ) : (
            <Icon name="play" size={16} aria-hidden="true" />
          )}
          <span>{running ? t("code.stop") : busy ? t("code.busy") : t("code.run")}</span>
        </Button>
      </div>
      {!runnable && (
        <p className="rounded-md bg-warn-bg px-3 py-2 text-sm" role="note">
          {t("code.cantRun", { language: t(`lang.${language}`) })}
        </p>
      )}
      <div className={cx("overflow-auto rounded-md border-2 border-line bg-code-bg", expanded ? "max-h-[80vh]" : "max-h-[440px]")}>
        <CodeEditor
          code={code}
          language={language}
          chips={chips}
          errorLine={error?.line || null}
          selectedChips={selectedChips}
          label={t("code.editor", { language: t(`lang.${language}`) })}
          chipTitle={chipTitle}
          onChange={(next) => store.dispatch({ type: "code/replace", code: next })}
          onChip={onChip}
          onRun={onRunToggle}
        />
      </div>
      {errorText && (
        <p role="alert" className="on-fill rounded-md bg-bad-bg px-3 py-2 font-mono text-sm" data-testid="code-error">
          {errorText}
          {error?.hint ? <span className="mt-1 block font-sans">{error.hint}</span> : null}
        </p>
      )}
    </section>
  );
}
