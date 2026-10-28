"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor, type EditorDiagnostic } from "@/components/boardlab/CodeEditor";
import { Button, Chip, EmptyState, IconButton, Tabs, type TabItem } from "@/components/ui";
import { LIMITS } from "@/core/limits";
import type { Messages } from "@/i18n/namespaces";
import type { Diagnostic } from "@/lib/interp/errors";
import { editToOp, firstFirmwareSource, languageOf, markersOf, mergeEdits, type TextEdit } from "@/studio/code/sources";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import type { UiStore } from "@/studio/stores/ui";

export interface CodeDockProps {
  doc: DocStore;
  ui: UiStore;
  /** What `check()` found in the firmware file. */
  diagnostics: readonly Diagnostic[];
  onRun(): void;
  messages: Messages["studioCode"];
}

type Notice = "tooBig" | "failed";
type Cursor = { line: number; col: number };
type Pending = { id: string; baseSeq: number; edit: TextEdit };

const COALESCE_MS = 500;
const COPIED_MS = 1600;
const NO_MARKERS: readonly EditorDiagnostic[] = [];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

/** The project's code files as tabs. Typing is committed as `source.edit` ops, a burst of keystrokes as one. */
export function CodeDock({ doc, ui, diagnostics, onRun, messages }: CodeDockProps) {
  const sources = useStoreSelector(doc, (s) => s.state.sources);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const height = useStoreSelector(ui, (s) => s.dockHeightPx);
  const [picked, setPicked] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copied, setCopied] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const pending = useRef<Pending | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const footer = useRef<HTMLDivElement>(null);

  const firmwareId = firstFirmwareSource({ sources })?.id;
  const activeId = picked !== null && sources.some((s) => s.id === picked) ? picked : (firmwareId ?? sources[0]?.id);
  const active = sources.find((s) => s.id === activeId);

  const markers = useMemo<EditorDiagnostic[]>(
    () => markersOf(diagnostics).map((m) => ({ ...m, message: `${fill(messages.marker[m.severity], { line: m.line, col: m.col })} ${m.message}` })),
    [diagnostics, messages],
  );
  const errorCount = markers.filter((m) => m.severity === "error").length;

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const edit = pending.current;
    pending.current = null;
    if (!edit || (edit.edit.del === 0 && edit.edit.ins === "")) return;
    const result = doc.commit([editToOp(edit.id, edit.baseSeq, edit.edit)], { label: "code.edit" });
    if (!result.ok) {
      setNotice(result.reject === "quota" ? "tooBig" : "failed");
      setEpoch((n) => n + 1);
    }
  }, [doc]);

  useEffect(() => flush, [flush]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  function record(id: string, edit: TextEdit) {
    setNotice(null);
    const merged = pending.current?.id === id ? mergeEdits(pending.current.edit, edit) : null;
    if (merged && pending.current) {
      pending.current.edit = merged;
    } else {
      flush();
      pending.current = { id, baseSeq: doc.getState().revision, edit };
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, COALESCE_MS);
  }

  function run() {
    flush();
    onRun();
  }

  async function copy() {
    flush();
    const text = doc.getState().state.sources.find((s) => s.id === activeId)?.content;
    if (text === undefined) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // The browser refused the clipboard; the button stays as it was.
    }
  }

  const escapeToNext = useCallback(() => footer.current?.querySelector("button")?.focus(), []);

  if (sources.length === 0) {
    return (
      <section aria-label={messages.title} className="bg-paper" style={{ height }}>
        <EmptyState icon="code" title={messages.noFiles}>
          {messages.noFilesHint}
        </EmptyState>
      </section>
    );
  }

  const tabs: TabItem[] = sources.map((source) => {
    const language = languageOf(source);
    const shown = source.id === firmwareId && language !== null;
    return {
      id: source.id,
      label: source.path,
      badge: shown && errorCount > 0 ? fill(messages.errors, { count: errorCount }) : undefined,
      content: (
        <CodeEditor
          key={epoch}
          code={source.content}
          language={language}
          label={fill(messages.editor, { path: source.path })}
          diagnostics={shown ? markers : NO_MARKERS}
          readOnly={readOnly}
          maxBytes={LIMITS.sourceBytes}
          onTooBig={() => setNotice("tooBig")}
          onEdit={(edit) => record(source.id, edit)}
          onCursor={(at) => setCursors((prev) => (prev[source.id]?.line === at.line && prev[source.id]?.col === at.col ? prev : { ...prev, [source.id]: at }))}
          escapeToNext={escapeToNext}
          onRun={run}
        />
      ),
    };
  });
  const cursor = cursors[activeId ?? ""] ?? { line: 1, col: 1 };

  return (
    <section aria-label={messages.title} className="flex min-h-0 flex-col bg-paper" style={{ height }} onBlur={flush}>
      <Tabs label={messages.files} tabs={tabs} value={activeId} onChange={setPicked} fill className="flex-1" panelClassName="bg-(--code-bg) p-0!" />
      <div ref={footer} className="flex shrink-0 flex-wrap items-center gap-3 border-t border-rule px-3 py-2">
        <p className="tabular text-sm text-muted">{fill(messages.position, cursor)}</p>
        {active && languageOf(active) === null ? <Chip>{messages.plain}</Chip> : null}
        {readOnly ? <Chip>{messages.readOnly}</Chip> : null}
        <p role="status" className={notice ? "min-w-0 flex-1 text-sm text-bad" : "min-w-0 flex-1 text-sm text-muted max-sm:sr-only"}>
          {notice ? messages[notice] : messages.escape}
        </p>
        <IconButton icon={copied ? "check" : "copy"} size="sm" label={copied ? messages.copied : messages.copy} onClick={copy} />
        <Button size="sm" variant="primary" onClick={run}>
          {messages.run}
        </Button>
      </div>
    </section>
  );
}
