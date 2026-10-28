"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ParamChip } from "@/content/schema";
import { canRun } from "@/lib/boardlab/engine";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { chipCode, copyText } from "@/lib/boardlab/template";
import { useText } from "./text";
import { useLab } from "./useLab";

function EditorSkeleton() {
  return (
    <div aria-busy="true" className="boardlab-code min-h-48 space-y-2 p-3" data-testid="code-editor-loading">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

const CodeEditor = dynamic(() => import("./CodeEditor").then((m) => m.CodeEditor), { ssr: false, loading: () => <EditorSkeleton /> });

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
      <div className="@container flex min-h-12 shrink-0 items-center gap-2 border-b border-rule py-2 pe-2 ps-4">
        {/* Under xl the rail is too narrow for the title beside Run, which says what the panel is, and so is a rail the
            open Lab tools drawer has narrowed (under 27rem); otherwise the title fits in every language, and "Edited"
            joins it where there is room for both (Reset lights up anyway). */}
        <h2 id={titleId} className="me-auto flex min-w-0 items-baseline gap-2 text-lg font-semibold max-xl:sr-only @max-[27rem]:sr-only">
          <span className="truncate">{t("code.title")}</span>
          {edited && <span className="kicker shrink-0 @max-[32rem]:sr-only">{t("code.edited")}</span>}
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
          className="shrink-0 whitespace-nowrap"
        >
          {running || busy ? (
            <Icon name="stop" size={16} aria-hidden="true" />
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
        <p className="shrink-0 bg-warn-bg px-4 py-2 text-sm" role="note">
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
        <p role="alert" className="flex shrink-0 items-start gap-2 border-t border-rule bg-bad-bg px-4 py-2 text-sm" data-testid="code-error">
          <Icon name="warn-circle" size={16} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
          <span className="min-w-0">
            <code className="font-mono">{errorText}</code>
            {error?.hint ? <span className="mt-1 block">{error.hint}</span> : null}
          </span>
        </p>
      )}
    </section>
  );
}
