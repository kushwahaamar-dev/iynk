"use client";

import { useId, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Chip, EmptyState, Icon, TextInput } from "@/components/ui";
import type { ChipTone, IconName } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { builtinRegistry } from "@/parts/builtin";
import { fallbackSpec } from "@/parts/fallback";
import { searchParts } from "@/parts/search";
import type { ModelLabel, PartEntry } from "@/parts/search";
import type { ArtElement, ArtProvider } from "@/studio/engine/types";
import { createArtProvider } from "@/studio/art/figure-art";

type EditMessages = Messages["studioEdit"];
type CategoryKey = keyof EditMessages["palette"]["category"];

export interface PaletteProps {
  index: readonly PartEntry[];
  /** The part the next click or tap on the canvas puts down; null once it is put away. */
  armed?: string | null;
  onArm(ref: string): void;
  onPlaceAtCentre(ref: string): void;
  messages: EditMessages;
  lang: Locale;
  art?: ArtProvider;
}

const MODEL_LOOK: Record<ModelLabel, { tone: ChipTone; icon: IconName }> = {
  modelled: { tone: "good", icon: "check-circle" },
  "partly-modelled": { tone: "warn", icon: "info" },
  "not-modelled-yet": { tone: "neutral", icon: "empty" },
};

const THUMB_PAD_MM = 1.5;
const THUMB_FALLBACK_MM = 10.16;

const builtin = builtinRegistry();
const builtinArt = createArtProvider({
  spec: (ref) => {
    const d = builtin.latest(ref);
    return d ? fallbackSpec(d) : null;
  },
});

/** The canvas is a light plate in both themes, so the art keeps its fixed colours here too. */
const PLATE: CSSProperties & Record<string, string> = {
  background: "var(--color-paper-fixed)",
  "--studio-paper": "var(--color-paper-fixed)",
  "--studio-ink": "var(--color-ink-fixed)",
  "--studio-body": "var(--color-mono-50)",
  "--studio-pin": "var(--color-metal-d)",
  "--studio-warn": "var(--color-tomato-m)",
};

function ArtNode({ e }: { e: ArtElement }) {
  const paint = { fill: e.t === "text" ? "var(--studio-ink)" : (e.fill ?? "none"), stroke: e.t === "text" ? undefined : e.stroke, strokeWidth: e.t === "text" ? undefined : e.sw };
  switch (e.t) {
    case "path":
      return <path d={e.d} {...paint} />;
    case "rect":
      return <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={e.rx} {...paint} />;
    case "circle":
      return <circle cx={e.cx} cy={e.cy} r={e.r} {...paint} />;
    case "ellipse":
      return <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} {...paint} />;
    case "text":
      return (
        <text x={e.x} y={e.y} fontSize={e.size ?? 2} textAnchor={e.anchor} fill={paint.fill}>
          {e.s}
        </text>
      );
  }
}

function Thumb({ entry, art }: { entry: PartEntry; art: ArtProvider }) {
  const w = entry.widthMm > 0 ? entry.widthMm : THUMB_FALLBACK_MM;
  const h = entry.heightMm > 0 ? entry.heightMm : THUMB_FALLBACK_MM;
  const elements = useMemo(() => art.get(entry.ref, 2, "illustrated"), [art, entry.ref]);
  return (
    <span aria-hidden="true" className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg" style={PLATE}>
      <svg viewBox={`${-THUMB_PAD_MM} ${-THUMB_PAD_MM} ${w + 2 * THUMB_PAD_MM} ${h + 2 * THUMB_PAD_MM}`} className="size-full p-1" focusable="false">
        {elements.map((e, i) => (
          <ArtNode key={i} e={e} />
        ))}
      </svg>
    </span>
  );
}

type ItemProps = {
  entry: PartEntry;
  armed: boolean;
  title: string;
  onArm(ref: string): void;
  onPlaceAtCentre(ref: string): void;
  messages: EditMessages;
  art: ArtProvider;
};

function Item({ entry, armed, title, onArm, onPlaceAtCentre, messages, art }: ItemProps) {
  const look = MODEL_LOOK[entry.model];
  function onKeyDown(ev: KeyboardEvent<HTMLButtonElement>) {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    onPlaceAtCentre(entry.ref);
  }
  return (
    <li>
      <button
        type="button"
        aria-pressed={armed}
        title={title}
        onClick={() => onArm(entry.ref)}
        onKeyDown={onKeyDown}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-start motion-fade hover:bg-hover aria-pressed:bg-sunken aria-pressed:ring-2 aria-pressed:ring-accent"
      >
        <Thumb entry={entry} art={art} />
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="text-sm font-semibold text-pretty">{entry.name}</span>
          <Chip tone={look.tone} title={messages.palette.modelLabel}>
            <Icon name={look.icon} size={16} aria-hidden="true" />
            <span className="sr-only">{messages.palette.modelLabel}: </span>
            {messages.palette.model[entry.model]}
          </Chip>
        </span>
      </button>
    </li>
  );
}

const categoryLabel = (messages: EditMessages, category: string): string => messages.palette.category[category as CategoryKey] ?? category;

/** R-055: a searchable list of the parts the registry offers, each with art, a name and what the simulator models of it. */
export function Palette({ index, armed = null, onArm, onPlaceAtCentre, messages, lang, art = builtinArt }: PaletteProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioEdit`), [lang, messages]);
  const [query, setQuery] = useState("");
  const listId = useId();
  const found = useMemo(() => searchParts(index, query, lang), [index, query, lang]);
  const armedEntry = armed === null ? undefined : index.find((e) => e.ref === armed);
  const grouped = query.trim() === "";

  const item = (entry: PartEntry) => (
    <Item key={entry.ref} entry={entry} armed={entry.ref === armed} title={t("palette.place", { name: entry.name })} onArm={onArm} onPlaceAtCentre={onPlaceAtCentre} messages={messages} art={art} />
  );
  const categories = grouped ? [...new Set(found.map((e) => e.category))] : [];

  return (
    <section aria-label={t("palette.title")} className="flex min-h-0 flex-col gap-3">
      <TextInput
        type="search"
        label={t("palette.search")}
        hideLabel
        placeholder={t("palette.search")}
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        aria-controls={listId}
        autoComplete="off"
        spellCheck={false}
      />
      <p role="status" className="sr-only">
        {t("palette.results", { count: found.length })}
      </p>
      {armedEntry ? <p className="rounded-lg bg-sunken p-3 text-sm text-pretty">{t("palette.armed", { name: armedEntry.name })}</p> : null}
      <div id={listId} className="min-h-0 flex-1 overflow-y-auto p-1">
        {found.length === 0 ? (
          <EmptyState icon="search" title={t("palette.empty", { query: query.trim() })}>
            {t("palette.emptyHelp")}
          </EmptyState>
        ) : grouped ? (
          categories.map((category) => (
            <div key={category} className="mb-4 last:mb-0">
              <h3 className="mb-1 px-2 text-xs font-semibold text-muted">{categoryLabel(messages, category)}</h3>
              <ul>{found.filter((e) => e.category === category).map(item)}</ul>
            </div>
          ))
        ) : (
          <ul>{found.map(item)}</ul>
        )}
      </div>
    </section>
  );
}
