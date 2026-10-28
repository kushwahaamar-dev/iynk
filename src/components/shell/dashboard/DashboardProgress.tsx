"use client";

import { ArrowLink, CtaLink } from "@/components/editorial/Editorial";
import { ProgressBadge } from "@/components/ui/ProgressBadge";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { useSaved } from "@/lib/progress/hooks";
import type { ProgressLab } from "@/lib/progress/keys";
import type { Saved } from "@/lib/progress/storage";
import type { DashEntry, DashItem } from "./data";

type Shell = Messages["shell"];
export type ProgressMessages = Pick<Shell["ui"], "progress" | "progressLabel">;
export type ContinueMessages = Shell["dashboard"]["continue"];

// A quiz counts once it has a recorded attempt, everything else once marked done.
function complete(saved: Saved, key: string): boolean {
  return saved.done[key] === true || saved.quiz[key] !== undefined;
}

/** "done/total" for one lab, counted from the saved keys. Renders nothing until something is done, unless `always`. */
export function LabProgress({ keys, label, messages, always = true }: { keys: readonly string[]; label: string; messages: ProgressMessages; always?: boolean }) {
  const t = useT(messages);
  const saved = useSaved();
  const done = keys.filter((key) => complete(saved, key)).length;
  const total = keys.length;
  if (!always && done === 0) return null;
  return (
    <ProgressBadge
      done={done}
      total={total}
      label={label}
      size="sm"
      countText={t("progress", { done, total })}
      valueText={t("progressLabel", { label, done, total })}
    />
  );
}

type Found = { item: DashItem; entry: DashEntry };

function describe({ entry }: Found, t: Translate<ContinueMessages>): string {
  const kind = t(`kinds.${entry.kind}`);
  return entry.label ? t("entry", { kind, name: entry.label }) : kind;
}

/** The last thing finished, and the next unfinished thing after it in the same lab. */
export function findContinue(items: readonly DashItem[], saved: Saved): { last: Found; next?: Found } | null {
  const byKey = new Map<string, Found>();
  for (const item of items) for (const entry of item.entries) byKey.set(entry.key, { item, entry });

  // Keys are stored in the order they were finished, so the last known one is the latest.
  const order = [...Object.keys(saved.done).filter((key) => saved.done[key]), ...Object.keys(saved.quiz)];
  let last: Found | undefined;
  for (let i = order.length - 1; i >= 0 && !last; i--) last = byKey.get(order[i]);
  if (!last) return null;

  const found = last;
  const sameLab = items.filter((item) => item.lab === found.item.lab);
  const start = sameLab.indexOf(found.item);
  for (let i = 0; i < sameLab.length; i++) {
    const item = sameLab[(start + i) % sameLab.length];
    const entry = item.entries.find((candidate) => !complete(saved, candidate.key));
    if (entry) return { last: found, next: { item, entry } };
  }
  return { last: found };
}

type HeroActionsProps = {
  items: readonly DashItem[];
  messages: ContinueMessages;
  progressMessages: ProgressMessages;
  labNames: Record<ProgressLab, string>;
  start: { href: string; label: string };
  browse: { href: string; label: string };
  overallLabel: string;
};

/**
 * The landing's calls to action. A first visit gets the Uno's first lesson and the boards;
 * a returning learner gets "Carry on" to the next unfinished thing, what they finished last,
 * and one quiet line of overall progress.
 */
export function HeroActions({ items, messages, progressMessages, labNames, start, browse, overallLabel }: HeroActionsProps) {
  const t = useT(messages);
  const p = useT(progressMessages);
  const saved = useSaved();
  const found = findContinue(items, saved);

  if (!found) {
    return (
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <CtaLink href={start.href}>{start.label}</CtaLink>
        <ArrowLink href={browse.href}>{browse.label}</ArrowLink>
      </div>
    );
  }

  const target = found.next ?? found.last;
  const keys = items.flatMap((item) => item.entries.map((entry) => entry.key));
  const done = keys.filter((key) => complete(saved, key)).length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <CtaLink href={target.entry.href}>
          {t("resume")}: {target.entry.label ?? target.item.title}
        </CtaLink>
        <ArrowLink href={browse.href}>{browse.label}</ArrowLink>
      </div>
      <p className="mt-6 text-sm text-muted">
        {t("last")}: <span className="font-medium text-ink">{found.last.item.title}</span> · {describe(found.last, t)} ·{" "}
        {labNames[found.last.item.lab]}
      </p>
      <p className="mt-1 text-sm text-muted tabular">{p("progressLabel", { label: overallLabel, done, total: keys.length })}</p>
    </div>
  );
}
