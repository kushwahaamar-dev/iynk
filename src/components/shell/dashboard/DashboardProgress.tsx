"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ProgressBadge } from "@/components/ui/ProgressBadge";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { useSaved } from "@/lib/progress/hooks";
import type { ProgressLab } from "@/lib/progress/keys";
import type { Saved } from "@/lib/progress/storage";
import type { DashEntry, DashItem } from "./data";
import { LAB_LOOK } from "./labs";

type Shell = Messages["shell"];
export type ProgressMessages = Pick<Shell["ui"], "progress" | "progressLabel">;
export type ContinueMessages = Shell["dashboard"]["continue"];

// A quiz counts once it has a recorded attempt, everything else once marked done.
function complete(saved: Saved, key: string): boolean {
  return saved.done[key] === true || saved.quiz[key] !== undefined;
}

/** "done/total" for one lab, counted from the saved keys. */
export function LabProgress({ keys, label, messages }: { keys: readonly string[]; label: string; messages: ProgressMessages }) {
  const t = useT(messages);
  const saved = useSaved();
  const done = keys.filter((key) => complete(saved, key)).length;
  const total = keys.length;
  return (
    <ProgressBadge
      done={done}
      total={total}
      label={label}
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

/** The last thing finished, and the next unfinished thing after it. */
export function ContinueCard({
  items,
  messages,
  labNames,
  startHref,
}: {
  items: readonly DashItem[];
  messages: ContinueMessages;
  labNames: Record<ProgressLab, string>;
  startHref: string;
}) {
  const t = useT(messages);
  const saved = useSaved();
  const byKey = new Map<string, Found>();
  for (const item of items) for (const entry of item.entries) byKey.set(entry.key, { item, entry });

  // Keys are stored in the order they were finished, so the last known one is the latest.
  const order = [...Object.keys(saved.done).filter((key) => saved.done[key]), ...Object.keys(saved.quiz)];
  let last: Found | undefined;
  for (let i = order.length - 1; i >= 0 && !last; i--) last = byKey.get(order[i]);

  if (!last) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl">{t("title")}</h2>
        <p className="max-w-prose">{t("empty")}</p>
        <div>
          <ButtonLink href={startHref} variant="primary">
            {t("begin")}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const found = last;
  const sameLab = items.filter((item) => item.lab === found.item.lab);
  const start = sameLab.indexOf(found.item);
  let next: Found | undefined;
  for (let i = 0; i < sameLab.length && !next; i++) {
    const item = sameLab[(start + i) % sameLab.length];
    const entry = item.entries.find((candidate) => !complete(saved, candidate.key));
    if (entry) next = { item, entry };
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl">{t("title")}</h2>
      <div>
        <div className="ink-kicker">{t("last")}</div>
        <p className="mt-1 flex flex-wrap items-center gap-2">
          <Chip tone={LAB_LOOK[found.item.lab].tone}>{labNames[found.item.lab]}</Chip>
          <span className="font-bold">{found.item.title}</span>
          <span className="text-muted">{describe(found, t)}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={(next ?? found).entry.href} variant="primary">
          {t("resume")}
        </ButtonLink>
        {next ? (
          <span className="text-sm text-muted">
            {next.item.title} · {describe(next, t)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
