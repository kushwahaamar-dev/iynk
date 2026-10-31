"use client";

import { useMemo, useState } from "react";
import { Button, Chip, EmptyState, SegmentedControl, Select } from "@/components/ui";
import { BOARD_IDS } from "@/content/ids";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { PROFILES, type BoardId } from "@/lib/interp/profiles";
import type { TemplateEntry, TemplateKind } from "@/project/guided/plan";
import { listLabTemplates, listTemplates } from "@/studio/templates";
import type { LabTemplateEntry } from "../../../content/projects";

export type LessonProgress = "done" | "legacy" | "none";
type Level = NonNullable<TemplateEntry["level"]>;
type Studio = Messages["studio"];

export const LEVELS: readonly Level[] = ["intro", "io", "input", "analog", "protocol", "wireless", "project"];

export interface TemplateGalleryProps {
  templates: readonly TemplateEntry[];
  lang: Locale;
  progress(templateId: string): LessonProgress;
  tier(templateId: string): string;
  onOpen(id: string, opts: { run: boolean }): void;
  messages: Studio;
}

type Group = { key: string; label: string; entries: TemplateEntry[] };

const LAB_KINDS: readonly LabTemplateEntry["kind"][] = ["bench", "craft", "task"];

const ALL = "all";
const byOrder = (a: TemplateEntry, b: TemplateEntry) => a.order - b.order;

export const titleOf = (entry: TemplateEntry, lang: string): string => entry.title[lang] ?? entry.title.en ?? entry.id;

export const boardName = (id: string): string => PROFILES[id as BoardId]?.name ?? id;

function TemplateCard({ entry, lang, progress, tier, onOpen, t }: { entry: TemplateEntry } & Pick<TemplateGalleryProps, "lang" | "progress" | "tier" | "onOpen"> & { t: (key: MessageKey<Studio>) => string }) {
  const title = titleOf(entry, lang);
  const status = progress(entry.id);
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-rule bg-surface p-4" data-testid="template-card" data-progress={status}>
      <h4 className="text-base font-semibold text-balance">{title}</h4>
      <p className="flex flex-wrap items-center gap-2">
        <Chip>{t(`lesson.gallery.rung.${entry.kind}` as MessageKey<Studio>)}</Chip>
        {entry.level ? <Chip>{t(`lesson.nav.level.${entry.level}` as MessageKey<Studio>)}</Chip> : null}
        <Chip>{boardName(entry.board)}</Chip>
      </p>
      <p className="text-sm text-muted">{tier(entry.id)}</p>
      <p className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden="true" className={`size-2 rounded-full ${status === "none" ? "bg-rule" : "bg-good"}`} />
        {t(`lesson.gallery.progress.${status}` as MessageKey<Studio>)}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <Button size="sm" variant="secondary" aria-label={`${t("lesson.gallery.start")}: ${title}`} onClick={() => onOpen(entry.id, { run: false })}>
          {t("lesson.gallery.start")}
        </Button>
        <Button size="sm" variant="secondary" aria-label={`${t("lesson.gallery.startRun")}: ${title}`} onClick={() => onOpen(entry.id, { run: true })}>
          {t("lesson.gallery.startRun")}
        </Button>
      </div>
    </li>
  );
}

function LabCard({ entry, lang, onOpen, t }: { entry: LabTemplateEntry } & Pick<TemplateGalleryProps, "lang" | "onOpen"> & { t: (key: MessageKey<Studio>, params?: { count: number }) => string }) {
  const title = entry.title[lang] ?? entry.title.en ?? entry.id;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-rule bg-surface p-4" data-testid="lab-card" data-kind={entry.kind}>
      <h4 className="text-base font-semibold text-balance">{title}</h4>
      <p className="flex flex-wrap items-center gap-2">
        {entry.board ? <Chip>{boardName(entry.board)}</Chip> : null}
        {entry.stepCount > 0 ? <Chip>{t("lesson.gallery.labs.steps", { count: entry.stepCount })}</Chip> : null}
      </p>
      <div className="mt-auto pt-2">
        <Button size="sm" variant="secondary" aria-label={`${t("lesson.gallery.start")}: ${title}`} onClick={() => onOpen(entry.id, { run: false })}>
          {t("lesson.gallery.start")}
        </Button>
      </div>
    </li>
  );
}

export function TemplateGallery({ templates, lang, progress, tier, onOpen, messages }: TemplateGalleryProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const [view, setView] = useState<"level" | "board">("level");
  const [board, setBoard] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [rung, setRung] = useState(ALL);

  const boards = useMemo(() => BOARD_IDS.filter((id) => templates.some((entry) => entry.board === id)), [templates]);

  const groups = useMemo<Group[]>(() => {
    const shown = listTemplates(templates, {
      board: board === ALL ? undefined : board,
      level: level === ALL ? undefined : level,
      kind: rung === ALL ? undefined : (rung as TemplateKind),
    });
    const sorted = [...shown].sort(byOrder);
    const all =
      view === "level"
        ? [
            ...LEVELS.map((id) => ({ key: id, label: t(`lesson.nav.level.${id}` as MessageKey<Studio>), entries: sorted.filter((e) => e.level === id) })),
            { key: "tour", label: t("lesson.gallery.rung.tour"), entries: sorted.filter((e) => e.level === null) },
          ]
        : boards.map((id) => ({ key: id, label: boardName(id), entries: sorted.filter((e) => e.board === id) }));
    return all.filter((group) => group.entries.length > 0);
  }, [templates, board, level, rung, view, boards, t]);

  const labGroups = useMemo(() => {
    if (level !== ALL || rung !== ALL) return [];
    return LAB_KINDS.map((kind) => ({
      kind,
      entries: listLabTemplates({ kind })
        .filter((e) => board === ALL || e.board === board)
        .toSorted((a, b) => a.order - b.order),
    })).filter((group) => group.entries.length > 0);
  }, [board, level, rung]);

  return (
    <section aria-labelledby="template-gallery" className="flex flex-col gap-6">
      <h2 id="template-gallery" className="text-xl font-semibold text-balance">
        {t("lesson.gallery.title")}
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <SegmentedControl
          label={t("lesson.gallery.title")}
          value={view}
          onChange={setView}
          options={[
            { value: "level", label: t("lesson.gallery.byLevel") },
            { value: "board", label: t("lesson.gallery.byBoard") },
          ]}
        />
        <Select label={t("lesson.nav.board")} value={board} onChange={(e) => setBoard(e.target.value)}>
          <option value={ALL}>{t("lesson.gallery.all")}</option>
          {boards.map((id) => (
            <option key={id} value={id}>
              {boardName(id)}
            </option>
          ))}
        </Select>
        <Select label={t("lesson.gallery.level")} value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value={ALL}>{t("lesson.gallery.all")}</option>
          {LEVELS.map((id) => (
            <option key={id} value={id}>
              {t(`lesson.nav.level.${id}` as MessageKey<Studio>)}
            </option>
          ))}
        </Select>
        <Select label={t("lesson.gallery.rung.label")} value={rung} onChange={(e) => setRung(e.target.value)}>
          <option value={ALL}>{t("lesson.gallery.all")}</option>
          <option value="lesson">{t("lesson.gallery.rung.lesson")}</option>
          <option value="tour">{t("lesson.gallery.rung.tour")}</option>
        </Select>
      </div>
      {groups.length === 0 && labGroups.length === 0 ? (
        <EmptyState title={t("lesson.gallery.empty")} />
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-labelledby={`gallery-${group.key}`} data-testid="gallery-group" data-group={group.key}>
            <h3 id={`gallery-${group.key}`} className="mb-3 text-lg font-semibold">
              {group.label} <span className="tabular-nums text-muted">{group.entries.length}</span>
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.entries.map((entry) => (
                <TemplateCard key={entry.id} entry={entry} lang={lang} progress={progress} tier={tier} onOpen={onOpen} t={t} />
              ))}
            </ul>
          </section>
        ))
      )}
      {labGroups.map((group) => (
        <section key={group.kind} aria-labelledby={`gallery-lab-${group.kind}`} data-testid="gallery-group" data-group={`lab-${group.kind}`}>
          <h3 id={`gallery-lab-${group.kind}`} className="mb-3 text-lg font-semibold">
            {t(`lesson.gallery.labs.${group.kind}`)} <span className="tabular-nums text-muted">{group.entries.length}</span>
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.entries.map((entry) => (
              <LabCard key={entry.id} entry={entry} lang={lang} onOpen={onOpen} t={t} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
