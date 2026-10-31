import { Button, Chip, cx, type ChipTone } from "@/components/ui";
import type { AiT } from "@/ai/messages";
import type { DryRunReport, ProposalRecord, ProposalState } from "@/ai/proposals/types";
import { DiffView } from "./DiffView";

export interface ProposalCardProps {
  record: ProposalRecord;
  report: DryRunReport | undefined;
  selected: ReadonlySet<string>;
  confirmed: ReadonlySet<string>;
  busy: boolean;
  undoable: boolean;
  notice: "refreshed" | "stale" | null;
  t: AiT;
  onToggleStep(id: string): void;
  onConfirmStep(id: string): void;
  onAccept(mode: "all" | "some" | "anyway"): void;
  onReject(): void;
  onUndo(): void;
  onRedo(): void;
}

const riskTone: Record<0 | 1 | 2, ChipTone> = { 0: "neutral", 1: "info", 2: "warn" };

const tickClass = "flex min-h-8 items-start gap-2 text-sm [@media(pointer:coarse)]:min-h-11";
const boxClass = "mt-1 size-4 shrink-0 accent-accent";

function checkRows(report: DryRunReport, t: AiT): { key: string; label: string; ok: boolean; note?: string }[] {
  const rows: { key: string; label: string; ok: boolean; note?: string }[] = [];
  if (report.rules) {
    rows.push({ key: "rules", label: t("proposal.checks.rules"), ok: !report.rules.added.some((finding) => finding.severity === "error") });
  }
  if (report.compile) {
    if ("skipped" in report.compile) {
      rows.push({ key: "compile", label: t("proposal.checks.compile"), ok: true, note: t("proposal.skipped", { reason: report.compile.skipped }) });
    } else rows.push({ key: "compile", label: t("proposal.checks.compile"), ok: report.compile.ok });
  }
  if (report.tests) {
    rows.push({ key: "tests", label: t("proposal.checks.tests"), ok: !report.tests.some((test) => test.after === "fail") });
  }
  if (report.run) rows.push({ key: "run", label: t("proposal.checks.run"), ok: true });
  return rows;
}

const decided: Partial<Record<ProposalState, { tone: ChipTone; label: "accepted" | "rejected" }>> = {
  accepted: { tone: "good", label: "accepted" },
  partial: { tone: "good", label: "accepted" },
  rejected: { tone: "neutral", label: "rejected" },
};

/** One proposal for review: its steps, what it changes, the checks, where it came from, and the buttons. */
export function ProposalCard(p: ProposalCardProps) {
  const { record, report, t } = p;
  const steps = record.proposal.steps.map((step, index) => ({
    id: step.id,
    heading: t("proposal.step", { n: index + 1, label: step.label ?? step.id }),
    risk: record.stepMeta[step.id]?.risk ?? 1,
  }));
  const needsTick = steps.filter((step) => step.risk === 2);
  const unconfirmed = (ids: Iterable<string>) => [...ids].some((id) => record.stepMeta[id]?.risk === 2 && !p.confirmed.has(id));
  const stale = p.notice === "stale" || record.state === "stale";
  const open = record.state === "open" && !stale;
  const outcome = decided[record.state];
  const cascade = report?.diff.cascade;
  const rationale = typeof record.proposal.rationale === "string" ? record.proposal.rationale : null;
  const modeLine = t("proposal.model", { model: record.model, mode: t(`mode.${record.mode}`) });
  const announce = stale ? "stale" : outcome ? outcome.label : open ? "open" : null;

  return (
    <article aria-label={modeLine} className="space-y-3 rounded-2xl bg-surface p-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announce ? t(`proposal.announce.${announce}`) : ""}
      </p>

      {rationale ? <p className="break-words text-sm">{rationale}</p> : null}

      {steps.length > 0 ? (
        <section className="space-y-1">
          <h4 className="text-sm font-semibold">{t("proposal.diff.steps")}</h4>
          <ul className="space-y-1">
            {steps.map((step) => (
              <li key={step.id} className="flex flex-wrap items-start justify-between gap-x-2">
                <label className={cx(tickClass, "min-w-0")}>
                  <input
                    type="checkbox"
                    className={boxClass}
                    checked={p.selected.has(step.id)}
                    disabled={!open || p.busy}
                    onChange={() => p.onToggleStep(step.id)}
                  />
                  <span className="min-w-0 break-words">{step.heading}</span>
                </label>
                <Chip tone={riskTone[step.risk]}>{t(`proposal.risk.${step.risk}`)}</Chip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open && cascade && needsTick.length > 0 ? (
        <ul className="space-y-1">
          {needsTick.map((step) => (
            <li key={step.id}>
              <label className={tickClass}>
                <input
                  type="checkbox"
                  className={boxClass}
                  checked={p.confirmed.has(step.id)}
                  disabled={p.busy}
                  onChange={() => p.onConfirmStep(step.id)}
                />
                <span className="min-w-0 break-words">
                  <span className="sr-only">{step.heading}: </span>
                  {t("proposal.confirmStep", { components: cascade.components, wires: cascade.wires, pins: cascade.pins })}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      {report ? (
        <>
          <DiffView diff={report.diff} t={t} />
          <section className="space-y-1">
            <h4 className="text-sm font-semibold">{t("proposal.diff.checks")}</h4>
            <ul className="space-y-1 text-sm">
              {checkRows(report, t).map((row) => (
                <li key={row.key} className="flex flex-wrap items-center gap-2">
                  <span>{row.label}</span>
                  <Chip tone={row.ok ? "good" : "bad"}>{row.ok ? t("proposal.diff.pass") : t("proposal.diff.fail")}</Chip>
                  {row.note ? <span className="text-xs text-muted">{row.note}</span> : null}
                </li>
              ))}
            </ul>
            {report.failing ? <p className="text-sm font-semibold text-bad">{t("proposal.failing")}</p> : null}
          </section>
        </>
      ) : (
        <div aria-busy="true" className="h-8 animate-pulse rounded-lg bg-sunken motion-reduce:animate-none" />
      )}

      <div className="space-y-1 text-xs text-muted">
        {record.taint.sources.length > 0 ? <p className="break-words">{t("proposal.taint", { sources: record.taint.sources.join(", ") })}</p> : null}
        <p className="break-words">{modeLine}</p>
        <p className="tabular">{t("proposal.base", { rev: record.proposal.base })}</p>
      </div>

      {p.notice === "refreshed" ? <p className="text-sm">{t("proposal.refreshed")}</p> : null}
      {stale ? (
        <div className="space-y-2">
          <p className="text-sm">{t("proposal.stale")}</p>
          <Button variant="secondary" size="sm" onClick={p.onRedo}>
            {t("proposal.redo")}
          </Button>
        </div>
      ) : null}

      {outcome ? (
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={outcome.tone}>{t(`proposal.${outcome.label}`)}</Chip>
          {outcome.label === "accepted" && p.undoable ? (
            <Button variant="secondary" size="sm" onClick={p.onUndo}>
              {t("proposal.undo")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {open && report ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            busy={p.busy}
            disabled={unconfirmed(steps.map((step) => step.id))}
            onClick={() => p.onAccept(report.failing ? "anyway" : "all")}
          >
            {report.failing ? t("proposal.acceptAnyway") : t("proposal.accept")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={p.busy || p.selected.size === 0 || unconfirmed(p.selected)}
            onClick={() => p.onAccept("some")}
          >
            {t("proposal.acceptSome")}
          </Button>
          <Button variant="ghost" size="sm" disabled={p.busy} onClick={p.onReject}>
            {t("proposal.reject")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
