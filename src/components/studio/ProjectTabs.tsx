"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, Skeleton } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { StudioMessages } from "@/i18n/namespaces";
import { LIMIT_MESSAGE, startChecks, type CheckHandle } from "@/lib/interp";
import type { CheckResult } from "@/lib/interp/checks";
import type { Op } from "@/project/generated/types";
import { DEFAULT_TEST_ID, type ProjectCheck } from "@/studio/checks";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import { boardPinsFor, checkJobFor, verdictsById } from "./checkJob";
import type { ChecksProblem } from "./ChecksEditor";
import { compareVersions, nameVersion, restoreVersion } from "./wiring/repositoryLink";

const loading = () => <Skeleton className="m-2 h-40 rounded-xl" />;
const HistoryPanel = dynamic(() => import("./HistoryPanel").then((m) => m.HistoryPanel), { ssr: false, loading });
const ChecksEditor = dynamic(() => import("./ChecksEditor").then((m) => m.ChecksEditor), { ssr: false, loading });

const NO_CHECKS: ProjectCheck[] = [];

export interface ChecksRun {
  results: Map<string, CheckResult>;
  running: boolean;
  problem: ChecksProblem | null;
  run(): void;
  cancel(): void;
}

/** Runs the project's checks on the first board. It lives above the tab, so the Run checks command works while another tab shows. */
export function useChecksRun(doc: DocStore): ChecksRun {
  const [results, setResults] = useState(() => new Map<string, CheckResult>());
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState<ChecksProblem | null>(null);
  const handle = useRef<CheckHandle | null>(null);

  const cancel = useCallback(() => {
    handle.current?.cancel();
    handle.current = null;
    setRunning(false);
  }, []);

  const run = useCallback(() => {
    if (handle.current) return;
    const state = doc.getState().state;
    const boardId = state.boards[0]?.id ?? "";
    const job = checkJobFor(state, DEFAULT_TEST_ID, boardId);
    if ("error" in job) {
      setProblem(job.error === "no-source" ? "no-source" : "unsupported-language");
      return;
    }
    const checks = state.tests.find((t) => t.id === DEFAULT_TEST_ID)?.checks ?? NO_CHECKS;
    setProblem(null);
    setRunning(true);
    const started = startChecks(job);
    handle.current = started;
    void started.result
      .then((outcome) => {
        setResults(verdictsById(checks, outcome.results));
        setProblem(outcome.trace.error?.message === LIMIT_MESSAGE ? "limit" : null);
      })
      .catch(() => setProblem("unsupported-language"))
      .finally(() => {
        if (handle.current === started) handle.current = null;
        setRunning(false);
      });
  }, [doc]);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ results, running, problem, run, cancel }), [results, running, problem, run, cancel]);
}

type TabProps = { doc: DocStore; messages: StudioMessages; lang: Locale };

export function HistoryTab({ doc, messages, lang }: TabProps) {
  const checkpoints = useStoreSelector(doc, (s) => s.state.history.checkpoints);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const { studio } = messages;

  async function name(label: string) {
    const made = await nameVersion(label);
    if (!made.ok) throw new Error(made.error);
  }

  return (
    <HistoryPanel
      checkpoints={checkpoints}
      onName={name}
      onCompare={compareVersions}
      onRestore={(revision) => restoreVersion(revision, studio.history.restore)}
      busy={false}
      inRoom={false}
      readOnly={readOnly}
      messages={studio}
      lang={lang}
    />
  );
}

export function ChecksTab({ doc, checksRun, messages, lang }: TabProps & { checksRun: ChecksRun }) {
  const state = useStoreSelector(doc, (s) => s.state);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const board = useMemo(() => boardPinsFor(state, state.boards[0]?.id ?? ""), [state]);
  const checks = state.tests.find((t) => t.id === DEFAULT_TEST_ID)?.checks ?? NO_CHECKS;

  if (!board) return <EmptyState icon="empty" title={messages.studio.checks.unsupportedLanguage} />;
  return (
    // A fieldset switches off every control inside it, which is what a read-only project needs.
    <fieldset disabled={readOnly} className="contents">
      <ChecksEditor
        state={state}
        checks={checks}
        results={checksRun.results}
        running={checksRun.running}
        problem={checksRun.problem}
        board={board}
        onChange={(ops: Op[]) => void doc.commit(ops, { label: messages.studio.checks.title })}
        onRun={checksRun.run}
        onCancel={checksRun.cancel}
        messages={messages.studio}
        lang={lang}
      />
    </fieldset>
  );
}
