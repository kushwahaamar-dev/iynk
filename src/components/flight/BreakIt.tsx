"use client";

import { useMemo } from "react";
import { Button, Card, Toggle } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { createTranslator } from "@/i18n/translate";
import { BREAKS, type BreakId, type CraftClass } from "@/lib/flight";
import type { FlightStrings } from "./FlightRange";

type Props = {
  craftClass: CraftClass;
  /** Whether each fault is on now (the build's own, or broken here). */
  isOn: (id: BreakId) => boolean;
  /** True when something here differs from the build, and when something is switched on here. */
  changed: boolean;
  broken: boolean;
  onToggle: (id: BreakId, on: boolean) => void;
  onReset: () => void;
  t: FlightStrings;
};

/** Break it and watch it fail: the mistakes a build can have, to switch on mid-flight and see what they do. */
export function BreakIt({ craftClass, isOn, changed, broken, onToggle, onReset, t: dict }: Props) {
  const locale = useLocale();
  const t = useMemo(() => createTranslator(locale, dict, "flight"), [locale, dict]);
  return (
    <Card as="section" aria-labelledby="break-it-title" padding="sm" className="space-y-2" data-testid="break-it">
      <h2 id="break-it-title" className="font-ui text-base font-extrabold uppercase tracking-wide">
        {dict.breakIt.title}
      </h2>
      <p className="text-sm text-muted">{dict.breakIt.lede}</p>
      <div className="divide-y divide-line">
        {BREAKS[craftClass].map((id) => (
          <div key={id} data-break={id} data-on={isOn(id)}>
            <Toggle checked={isOn(id)} onChange={(on) => onToggle(id, on)} label={t(`breakIt.items.${id}.label`)} description={t(`breakIt.items.${id}.what`)} />
          </div>
        ))}
      </div>
      {broken ? <p className="text-sm font-bold">{dict.breakIt.noBoard}</p> : null}
      <Button size="sm" onClick={onReset} disabled={!changed} data-testid="break-reset">
        {dict.breakIt.reset}
      </Button>
    </Card>
  );
}
