"use client";

import { useMemo } from "react";
import { Button, Toggle } from "@/components/ui";
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
    <section aria-labelledby="break-it-title" className="space-y-2" data-testid="break-it">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="break-it-title" className="font-head text-lg">
          {dict.breakIt.title}
        </h2>
        {/* nothing to undo: the button keeps its place but isn't drawn, so the heading doesn't jump */}
        <Button size="sm" variant="ghost" onClick={onReset} disabled={!changed} className={changed ? undefined : "invisible"} data-testid="break-reset">
          {dict.breakIt.reset}
        </Button>
      </div>
      <p className="text-sm text-muted">{dict.breakIt.lede}</p>
      <div className="divide-y divide-rule">
        {BREAKS[craftClass].map((id) => (
          // the whole row switches it, not only the switch at its end
          <div
            key={id}
            data-break={id}
            data-on={isOn(id)}
            className="-mx-2 cursor-pointer rounded-ink-sm px-2 py-1 hover:bg-sunken"
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('[role="switch"]')) onToggle(id, !isOn(id));
            }}
          >
            <Toggle checked={isOn(id)} onChange={(on) => onToggle(id, on)} label={t(`breakIt.items.${id}.label`)} description={t(`breakIt.items.${id}.what`)} />
          </div>
        ))}
      </div>
      {broken ? (
        <p className="border-s-4 border-tomato ps-3 text-sm font-semibold" role="status">
          {dict.breakIt.noBoard}
        </p>
      ) : null}
    </section>
  );
}
