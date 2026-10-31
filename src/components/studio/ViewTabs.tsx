"use client";

import { useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { VIEW_DEFS } from "@/studio/views/registry";
import type { ViewKind } from "@/studio/views/registry";

export interface ViewTabsProps {
  active: ViewKind;
  onChange(kind: ViewKind): void;
  messages: Messages["studio"];
  lang: Locale;
}

export function ViewTabs({ active, onChange, messages, lang }: ViewTabsProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const refs = useRef<Partial<Record<ViewKind, HTMLButtonElement | null>>>({});

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = VIEW_DEFS.findIndex((d) => d.kind === active);
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % VIEW_DEFS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + VIEW_DEFS.length) % VIEW_DEFS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = VIEW_DEFS.length - 1;
    else return;
    event.preventDefault();
    const kind = VIEW_DEFS[next]!.kind;
    onChange(kind);
    refs.current[kind]?.focus();
  }

  return (
    <div role="tablist" aria-label={t("views.tablist")} onKeyDown={onKeyDown} className="inline-flex gap-1 rounded-lg bg-sunken p-1">
      {VIEW_DEFS.map((def) => {
        const selected = def.kind === active;
        return (
          <button
            key={def.kind}
            ref={(el) => {
              refs.current[def.kind] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(def.kind)}
            className={`inline-flex min-h-8 items-center rounded-md px-3 text-sm font-semibold motion-fade focus-visible:outline-2 focus-visible:outline-(--focus) ${
              selected ? "bg-surface text-ink shadow-sm" : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            {t(def.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
