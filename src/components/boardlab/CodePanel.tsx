"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
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
  /** Expanded code takes more of the screen (the workspace widens its rail). */
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  className?: string;
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

/**
 * "Try it yourself": the editable code with one toolbar (Run, then Reset, Copy
 * and Expand as icons, always in the same place) and the compile error under it.
 */
export function CodePanel({ store, chipParts, onChip, onRunToggle, expanded, onExpand, className }: Props) {
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
    <section aria-labelledby={titleId} className={cx("flex min-h-0 flex-col", className)} data-testid="code-panel">
      <div className="flex min-h-13 shrink-0 items-center gap-1.5 border-b-[1.5px] border-rule py-1.5 pe-2 ps-4">
        <h2 id={titleId} className="me-auto flex min-w-0 items-baseline gap-2 font-head text-lg max-sm:sr-only">
          <span className="truncate">{t("code.title")}</span>
          {edited && <span className="ink-kicker shrink-0">{t("code.edited")}</span>}
        </h2>
        <Button
          size="md"
          variant={running ? "danger" : "primary"}
          onClick={onRunToggle}
          disabled={!runnable}
          aria-busy={busy || undefined}
          aria-keyshortcuts="Space"
          title={running ? t("code.stopTitle") : t("code.runTitle")}
          data-testid="run-button"
          className={cx("shrink-0 whitespace-nowrap", busy && "animate-pulse motion-reduce:animate-none")}
        >
          {running || busy ? (
            <span aria-hidden="true" className="inline-block size-3 rounded-[2px] bg-current" />
          ) : (
            <Icon name="play" size={16} aria-hidden="true" />
          )}
          <span>{running ? t("code.stop") : busy ? t("code.busy") : t("code.run")}</span>
        </Button>
        <IconButton icon="undo" size="sm" label={t("code.reset")} title={t("code.resetTitle")} disabled={!edited || busy} onClick={() => store.dispatch({ type: "code/reset" })} />
        <IconButton
          icon={copied ? "check" : "copy"}
          size="sm"
          label={copied ? t("code.copied") : t("code.copy")}
          onClick={async () => {
            if (await copyToClipboard(copyText(store.getState().code))) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }
          }}
        />
        {/* A toggle keeps one name and says pressed; the tooltip says what the next press does. */}
        <IconButton
          icon="expand"
          size="sm"
          label={t("code.expand")}
          title={expanded ? t("code.collapse") : undefined}
          aria-pressed={expanded}
          onClick={() => onExpand(!expanded)}
        />
      </div>
      {!runnable && (
        <p className="on-fill shrink-0 bg-warn-bg px-4 py-2 text-sm" role="note">
          {t("code.cantRun", { language: t(`lang.${language}`) })}
        </p>
      )}
      <div className={cx("min-h-0 flex-1 overflow-auto bg-code-bg", expanded ? "max-lg:max-h-[80svh]" : "max-lg:max-h-[min(28rem,60svh)]")}>
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
        <p role="alert" className="on-fill shrink-0 border-t-[1.5px] border-bad bg-bad-bg px-4 py-2 font-mono text-sm" data-testid="code-error">
          {errorText}
          {error?.hint ? <span className="mt-1 block font-body">{error.hint}</span> : null}
        </p>
      )}
    </section>
  );
}
