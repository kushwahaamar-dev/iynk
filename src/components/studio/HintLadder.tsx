"use client";

import { useMemo } from "react";
import { Button, Chip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { nextLevel, type ladderFor, type ResolvedLevel } from "@/sim/faults/hints";

type FaultsKey = MessageKey<Messages["faults"]>;

export interface HintLadderProps {
  levels: ReturnType<typeof ladderFor>;
  opened: 0 | 1 | 2 | 3;
  onOpen(level: 1 | 2 | 3): void;
  disabled?: boolean;
  messages: Messages["faults"];
  lang: Locale;
}

export function HintLadder({ levels, opened, onOpen, disabled = false, messages, lang }: HintLadderProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/faults`), [lang, messages]);
  const next = nextLevel(opened);
  const say = ({ text }: ResolvedLevel) => (typeof text === "string" ? text : t(text.key as FaultsKey, text.args));
  const latest = opened === 0 ? undefined : levels[opened - 1];

  return (
    <section aria-label={t("hint.title")} className="flex flex-col gap-2" data-testid="hint-ladder">
      <h3 className="text-sm font-semibold">{t("hint.title")}</h3>
      <ol className="flex flex-col gap-2">
        {levels.map((l) => {
          const open = l.level <= opened;
          return (
            <li key={l.level} data-level={l.level} data-state={open ? "open" : l.level === next ? "next" : "locked"} className="flex flex-col gap-1 rounded-lg bg-sunken px-3 py-2">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {t(`hint.level.${l.level}`)}
                {open && l.generated ? <Chip tone="info">{t("hint.generated")}</Chip> : null}
              </span>
              {open ? (
                <p className="text-pretty text-sm">{say(l)}</p>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" disabled={disabled || l.level !== next} onClick={() => onOpen(l.level)}>
                    {t("hint.open")}
                  </Button>
                  {l.level === next ? null : <span className="text-sm text-muted">{t("hint.locked")}</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {latest ? say(latest) : null}
      </p>
    </section>
  );
}
