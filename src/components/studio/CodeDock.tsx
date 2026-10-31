"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Timers } from "@/collab/client";
import { createSourceBatcher } from "@/collab/source-batch";
import { CodeEditor, type EditorDiagnostic } from "@/components/boardlab/CodeEditor";
import { Button, Chip, EmptyState, IconButton, Tabs, type TabItem } from "@/components/ui";
import { LIMITS } from "@/core/limits";
import type { Messages } from "@/i18n/namespaces";
import type { Diagnostic } from "@/lib/interp/errors";
import { editToOp, firstFirmwareSource, languageOf, markersOf, type TextEdit, type WriteGate } from "@/studio/code/sources";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import type { UiStore } from "@/studio/stores/ui";

export interface CodeDockProps {
  doc: DocStore;
  ui: UiStore;
  /** What `check()` found in the firmware file. */
  diagnostics: readonly Diagnostic[];
  onRun(): void;
  /** Set inside a room: who may type, and how to ask for or hand back the keyboard. */
  gate?: WriteGate;
  onRequestBaton?(): void;
  onReleaseBaton?(): void;
  messages: Messages["studioCode"];
}

type Notice = "tooBig" | "failed";
type Cursor = { line: number; col: number };

const COALESCE_MS = 250;
const WINDOW_TIMERS: Timers = { setTimeout: (fn, ms) => window.setTimeout(fn, ms), clearTimeout: (handle) => window.clearTimeout(handle as number) };
const COPIED_MS = 1600;
const NO_MARKERS: readonly EditorDiagnostic[] = [];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]));

function batonLine(gate: WriteGate, m: Messages["studioCode"]["baton"]): string {
  if (gate.writable) return m.you;
  if (gate.reason === "viewer") return m.viewer;
  if (gate.reason === "ended") return m.ended;
  return gate.holderName ? fill(m.heldBy, { name: gate.holderName }) : m.nobody;
}

/** The project's code files as tabs. Typing is committed as `source.edit` ops, a burst of keystrokes as one. */
export function CodeDock({ doc, ui, diagnostics, onRun, gate, onRequestBaton, onReleaseBaton, messages }: CodeDockProps) {
  const sources = useStoreSelector(doc, (s) => s.state.sources);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const height = useStoreSelector(ui, (s) => s.dockHeightPx);
  const [picked, setPicked] = useState<string | null>(null);
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copied, setCopied] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const footer = useRef<HTMLDivElement>(null);

  const firmwareId = firstFirmwareSource({ sources })?.id;
  const activeId = picked !== null && sources.some((s) => s.id === picked) ? picked : (firmwareId ?? sources[0]?.id);
  const active = sources.find((s) => s.id === activeId);

  const markers = useMemo<EditorDiagnostic[]>(
    () => markersOf(diagnostics).map((m) => ({ ...m, message: `${fill(messages.marker[m.severity], { line: m.line, col: m.col })} ${m.message}` })),
    [diagnostics, messages],
  );
  const errorCount = markers.filter((m) => m.severity === "error").length;

  const burst = useMemo(() => {
    const open: { baseSeq: number | null } = { baseSeq: null };
    const batcher = createSourceBatcher({
      flushMs: COALESCE_MS,
      timers: WINDOW_TIMERS,
      emit: (edits) => {
        const base = open.baseSeq ?? doc.confirmedSeq;
        open.baseSeq = null;
        const result = doc.commit(
          edits.map(({ id, ...edit }) => editToOp(id, base, edit)),
          { label: "code.edit" },
        );
        if (!result.ok) {
          setNotice(result.reject === "quota" ? "tooBig" : "failed");
          setEpoch((n) => n + 1);
        }
      },
    });
    return {
      flush: batcher.flush,
      push(id: string, edit: TextEdit) {
        open.baseSeq ??= doc.confirmedSeq;
        batcher.push({ id, ...edit });
      },
    };
  }, [doc]);
  const flush = burst.flush;

  useEffect(() => flush, [flush]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  function record(id: string, edit: TextEdit) {
    if (gate && !gate.writable) return;
    setNotice(null);
    burst.push(id, edit);
  }

  function giveBack() {
    flush();
    onReleaseBaton?.();
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
          readOnly={readOnly || (gate !== undefined && !gate.writable)}
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
    <section aria-label={messages.title} className="flex min-h-0 flex-col bg-paper" style={{ height }} onBlur={flush} onCompositionEnd={flush}>
      <Tabs label={messages.files} tabs={tabs} value={activeId} onChange={setPicked} fill className="flex-1" panelClassName="bg-(--code-bg) p-0!" />
      <div ref={footer} className="flex shrink-0 flex-wrap items-center gap-3 border-t border-rule px-3 py-2">
        <p className="tabular text-sm text-muted">{fill(messages.position, cursor)}</p>
        {active && languageOf(active) === null ? <Chip>{messages.plain}</Chip> : null}
        {readOnly ? <Chip>{messages.readOnly}</Chip> : null}
        {gate ? (
          <>
            <p role="status" className="text-sm text-ink">
              {batonLine(gate, messages.baton)}
            </p>
            {!gate.writable && gate.reason === "not-holder" && onRequestBaton ? (
              <Button size="sm" variant="secondary" onClick={onRequestBaton}>
                {messages.baton.ask}
              </Button>
            ) : null}
            {gate.writable && onReleaseBaton ? (
              <Button size="sm" variant="secondary" onClick={giveBack}>
                {messages.baton.giveBack}
              </Button>
            ) : null}
          </>
        ) : null}
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
