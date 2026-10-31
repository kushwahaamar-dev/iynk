"use client";

import { useId, useMemo } from "react";
import { Button, Chip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";
import type { FaultOffer, FaultOffers } from "@/studio/guide/lesson-faults";

export interface FaultListProps {
  offers: FaultOffers;
  active: readonly string[];
  onSet(faultId: string, on: boolean): void;
  messages: Messages["studio"];
  lang: Locale;
}

type T = Translate<Messages["studio"]>;

function Row({ offer, on, onSet, t }: { offer: FaultOffer; on: boolean; onSet(faultId: string, on: boolean): void; t: T }) {
  return (
    <li className="flex items-center gap-3 py-2" data-failure={offer.failureId}>
      <span className="min-w-0 flex-1 text-base">{offer.title}</span>
      {on && <Chip tone="bad">{t("lesson.faults.active")}</Chip>}
      <Button size="sm" variant={on ? "secondary" : "danger"} onClick={() => onSet(offer.faultId, !on)}>
        {on ? t("lesson.faults.repair") : t("lesson.faults.trigger")}
      </Button>
    </li>
  );
}

export function FaultList({ offers, active, onSet, messages, lang }: FaultListProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const titleId = useId();
  const rows = (list: FaultOffer[]) => list.map((offer) => <Row key={offer.failureId} offer={offer} on={active.includes(offer.faultId)} onSet={onSet} t={t} />);
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-base font-semibold">
        {t("lesson.faults.title")}
      </h2>
      {offers.own.length > 0 && (
        <>
          <p className="kicker">{t("lesson.faults.own")}</p>
          <ul className="divide-y divide-rule">{rows(offers.own)}</ul>
        </>
      )}
      {offers.more.length > 0 && (
        <>
          <p className="kicker mt-3">{t("lesson.faults.more")}</p>
          <ul className="divide-y divide-rule">{rows(offers.more)}</ul>
        </>
      )}
      {offers.unmapped.length > 0 && (
        <ul className="divide-y divide-rule">
          {offers.unmapped.map(({ failureId, title }) => (
            <li key={failureId} className="py-2 text-sm text-muted" data-failure={failureId}>
              {t("lesson.faults.notModelled", { title })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
