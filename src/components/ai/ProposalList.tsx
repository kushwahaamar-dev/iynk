"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { AiT } from "@/ai/messages";
import type { AcceptSelection } from "@/ai/proposals/accept";
import { Button, Callout } from "@/components/ui";
import { ProposalCard } from "./ProposalCard";
import type { ProposalHost, ProposalView } from "./wiring/proposalHost";

const PREVIEW_DEBOUNCE_MS = 150;

export const proposalDomId = (id: string) => `proposal-${id}`;

function Item({ view, host, t }: { view: ProposalView; host: ProposalHost; t: AiT }) {
  const { record } = view;
  const id = record.proposal.id;
  const stepIds = record.proposal.steps.map((step) => step.id);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(stepIds));
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const first = useRef(true);

  // The preview follows the ticks, so the hash the person accepts is the hash of what they see.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (record.state !== "open" || selected.size === 0) return;
    const timer = setTimeout(() => void host.preview(id, [...selected]).catch(() => undefined), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [host, id, selected, record.state]);

  const flip = (set: ReadonlySet<string>, key: string): ReadonlySet<string> => {
    const next = new Set(set);
    if (!next.delete(key)) next.add(key);
    return next;
  };

  async function accept(mode: "all" | "some" | "anyway") {
    if (!view.report) return;
    const sel: AcceptSelection = {
      stepIds: mode === "some" ? [...selected] : stepIds,
      confirmed: [...confirmed],
      anyway: mode === "anyway",
      shownDiffHash: view.report.diffHash,
    };
    setBusy(true);
    setProblem(null);
    try {
      const result = await host.accept(id, sel);
      if (!result.ok && result.reason === "apply_rejected") setProblem(`${result.reject.code}: ${result.reject.message}`);
      if (!result.ok && result.reason === "bad_selection") setProblem(result.message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await host.reject(id);
    } finally {
      setBusy(false);
    }
  }

  if (view.pendingTaint) {
    return (
      <li id={proposalDomId(id)} tabIndex={-1} className="scroll-mt-3">
        <Callout tone="warn" live>
          <p>{t("proposal.tainted")}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => void host.confirmTaint(id)}>
            {t("proposal.show")}
          </Button>
        </Callout>
      </li>
    );
  }

  return (
    <li id={proposalDomId(id)} tabIndex={-1} className="scroll-mt-3 space-y-2 outline-none">
      {view.changedSince !== null && record.state === "open" ? (
        <p className="text-xs text-muted tabular-nums">{t("proposal.changedSince", { rev: view.changedSince })}</p>
      ) : null}
      <ProposalCard
        record={record}
        report={view.report}
        selected={selected}
        confirmed={confirmed}
        busy={busy}
        undoable={view.undoable}
        notice={view.notice}
        t={t}
        onToggleStep={(step) => setSelected((all) => flip(all, step))}
        onConfirmStep={(step) => setConfirmed((all) => flip(all, step))}
        onAccept={(mode) => void accept(mode)}
        onReject={() => void reject()}
        onUndo={() => host.undo(id)}
        onRedo={() => host.redoRequest(id)}
      />
      {problem ? (
        <p role="alert" className="break-words text-sm font-semibold text-bad">
          {problem}
        </p>
      ) : null}
    </li>
  );
}

/** The proposals of one thread, newest first. Each card announces its own state. */
export function ProposalList({ host, threadId, t }: { host: ProposalHost; threadId: string; t: AiT }) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => host.subscribe(rerender), [host]);

  const views = host.list(threadId);
  if (views.length === 0) return null;
  return (
    <section aria-label={t("proposal.list")}>
      <ul className="space-y-3">
        {views.map((view) => (
          <Item key={view.record.proposal.id} view={view} host={host} t={t} />
        ))}
      </ul>
    </section>
  );
}
