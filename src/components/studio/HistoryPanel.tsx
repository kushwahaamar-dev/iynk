"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button, Chip, EmptyState, FieldMessage, TextInput, cx } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Checkpoint } from "@/project/generated/types";
import type { DiffItem, RevisionDiff } from "@/studio/history/compare";
import { CHECKPOINT_POLICY } from "@/studio/history/revisions";

export interface HistoryPanelProps {
  checkpoints: readonly Checkpoint[];
  /** Rejects with the code of a failed checkpoint (`limit`, `store`, `bad_author`) or with the store's own message. */
  onName(label: string): Promise<void>;
  onCompare(a: number, b: number): Promise<RevisionDiff | "mismatch">;
  onRestore(revision: number): Promise<void>;
  busy: boolean;
  inRoom: boolean;
  readOnly: boolean;
  messages: Messages["studio"];
  lang: Locale;
}

const MAX_LABEL = 80;

const itemName = (item: DiffItem): string => (item.refdes ? `${item.refdes} ${item.label}` : item.label);

export function HistoryPanel({ checkpoints, onName, onCompare, onRestore, busy, inRoom, readOnly, messages, lang }: HistoryPanelProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const when = useMemo(() => new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }), [lang]);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const [comparing, setComparing] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [diff, setDiff] = useState<RevisionDiff | "mismatch">();
  const [confirming, setConfirming] = useState<number>();
  const [restored, setRestored] = useState("");
  const [working, setWorking] = useState(false);

  const locked = busy || working;
  const canChange = !readOnly && !locked;
  const rows = useMemo(() => [...checkpoints].reverse(), [checkpoints]);

  const nameOf = (cp: Checkpoint) => cp.label ?? (cp.kind === "named" ? t("history.named") : t("history.auto"));

  function reasonOf(cause: unknown): string {
    const code = cause instanceof Error ? cause.message : String(cause);
    return code === "limit" ? t("history.limit", { max: CHECKPOINT_POLICY.max }) : t("history.storeFailed", { reason: code });
  }

  async function guarded(work: () => Promise<void>) {
    setWorking(true);
    setFailure(undefined);
    try {
      await work();
    } catch (cause) {
      setFailure(reasonOf(cause));
    } finally {
      setWorking(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    if (trimmed === "") return setLabelError(t("history.labelRequired"));
    if (trimmed.length > MAX_LABEL) return setLabelError(t("history.labelTooLong", { max: MAX_LABEL }));
    setLabelError(undefined);
    void guarded(async () => {
      await onName(trimmed);
      setLabel("");
    });
  }

  function toggleCompare() {
    setComparing(!comparing);
    setPicks([]);
    setDiff(undefined);
    setConfirming(undefined);
  }

  function pick(revision: number) {
    const next = picks.length === 1 && picks[0] !== revision ? [picks[0]!, revision] : [revision];
    setPicks(next);
    setDiff(undefined);
    if (next.length === 2) void guarded(async () => setDiff(await onCompare(next[0]!, next[1]!)));
  }

  function restore(cp: Checkpoint) {
    void guarded(async () => {
      await onRestore(cp.revision);
      setConfirming(undefined);
      setRestored(t("a11y.restored", { label: nameOf(cp) }));
    });
  }

  return (
    <section aria-label={t("history.title")} className="flex min-h-0 flex-col gap-3" data-testid="history-panel">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("history.title")}</h3>
        <Button size="sm" variant="ghost" outline aria-pressed={comparing} disabled={rows.length < 2} onClick={toggleCompare}>
          {t("history.compare")}
        </Button>
      </div>

      <form onSubmit={submit} noValidate className="flex shrink-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            label={t("history.nameLabel")}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            error={labelError}
            disabled={!canChange}
            autoComplete="off"
          />
        </div>
        <Button type="submit" size="sm" variant="primary" disabled={!canChange} busy={working}>
          {t("history.nameThis")}
        </Button>
      </form>

      {failure ? <FieldMessage id="history-failure" error={failure} /> : null}
      <p role="status" className="sr-only">
        {restored}
      </p>

      {rows.length === 0 ? (
        <EmptyState icon="book" title={t("history.empty")} className="py-8" />
      ) : (
        <ul className="flex min-h-0 flex-col overflow-y-auto">
          {rows.map((cp) => {
            const picked = picks.includes(cp.revision);
            return (
              <li key={cp.revision} className="rounded-lg px-3 py-2" data-revision={cp.revision}>
                <div className="flex flex-wrap items-center gap-2">
                  {comparing ? (
                    <button
                      type="button"
                      aria-pressed={picked}
                      disabled={locked}
                      onClick={() => pick(cp.revision)}
                      className={cx(
                        "min-w-0 flex-1 rounded-md px-2 py-1 text-start text-sm font-semibold motion-fade hover:bg-hover active:scale-98 disabled:opacity-50",
                        picked && "bg-sunken",
                      )}
                    >
                      {nameOf(cp)}
                    </button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{nameOf(cp)}</span>
                  )}
                  <Chip tone={cp.kind === "named" ? "ink" : "neutral"}>{t(cp.kind === "named" ? "history.named" : "history.auto")}</Chip>
                  <time dateTime={cp.at} className="text-xs text-muted tabular-nums">
                    {when.format(new Date(cp.at))}
                  </time>
                  {comparing ? null : (
                    <Button size="sm" variant="ghost" disabled={!canChange || inRoom} onClick={() => setConfirming(cp.revision)}>
                      {t("history.restore")}
                    </Button>
                  )}
                </div>
                {confirming === cp.revision ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg bg-sunken p-3">
                    <p className="text-sm text-pretty">{t("history.restoreHelp")}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" busy={working} onClick={() => restore(cp)}>
                        {t("history.restore")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={working} onClick={() => setConfirming(undefined)}>
                        {t("dialog.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {diff === "mismatch" ? (
        <p role="alert" className="text-sm text-bad">
          {t("history.mismatch")}
        </p>
      ) : diff ? (
        <DiffLines diff={diff} t={t} />
      ) : null}
    </section>
  );
}

function DiffLines({ diff, t }: { diff: RevisionDiff; t: ReturnType<typeof createTranslator<Messages["studio"]>> }) {
  const lines: string[] = [];
  const list = (key: "added" | "removed" | "changed", items: DiffItem[]) => {
    if (items.length > 0) lines.push(t(`history.diff.${key}`, { items: items.map(itemName).join(", ") }));
  };
  for (const group of [diff.parts, diff.tests]) {
    list("added", group.added);
    list("removed", group.removed);
    list("changed", group.changed);
  }
  if (diff.nets.differing.length > 0) lines.push(t("history.diff.nets", { count: diff.nets.differing.length }));
  if (diff.files.length > 0) lines.push(t("history.diff.files", { count: diff.files.length }));

  return (
    <ul aria-label={t("history.compare")} className="flex shrink-0 flex-col gap-1 rounded-lg bg-sunken p-3 text-sm text-pretty" data-testid="history-diff">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
