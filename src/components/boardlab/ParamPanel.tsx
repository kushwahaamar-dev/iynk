"use client";

import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import type { ParamChip } from "@/content/schema";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

/** The lesson's parameters as real controls; the same values the code chips show. */
export function ParamPanel({ store, pulse }: { store: BoardLabStore; pulse: string | null }) {
  const { t, tc, has } = useText();
  const params = useLab(store, (s) => s.params);
  const values = useLab(store, (s) => s.values);
  const id = useId();
  if (params.length === 0) return null;

  const set = (pid: string, value: number | string | boolean) => store.dispatch({ type: "param/set", id: pid, value });

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3" data-testid="param-panel">
      <h3 id={`${id}-title`} className="sr-only">
        {t("params.title")}
      </h3>
      <p className="text-sm text-muted">{t("params.lede")}</p>
      <ul className="flex flex-col gap-4">
        {params.map((p: ParamChip) => {
          const value = values[p.id] ?? p.default;
          return (
            <li key={p.id} id={`param-${p.id}`} className={cx("rounded-md p-1 transition-colors", pulse === p.id && "bg-mint/30")}>
              {p.kind === "number" && (
                <label className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                    <span>{tc(p.label)}</span>
                    <output className="font-mono tabular">
                      {String(value)}
                      {p.unit ? ` ${p.unit}` : ""}
                    </output>
                  </span>
                  <input
                    type="range"
                    className="h-11 w-full"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={Number(value)}
                    onChange={(e) => set(p.id, Number(e.target.value))}
                  />
                </label>
              )}
              {p.kind === "choice" && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold" id={`${id}-${p.id}`}>
                    {tc(p.label)}
                  </span>
                  <SegmentedControl
                    label={tc(p.label)}
                    size="sm"
                    value={String(value)}
                    onChange={(v) => set(p.id, v)}
                    options={p.options.map((o) => ({ value: o.value, label: tc(o.label) }))}
                  />
                  {(() => {
                    const note = p.options.find((o) => o.value === value)?.note;
                    return has(note) ? <p className="text-sm text-muted">{tc(note)}</p> : null;
                  })()}
                </div>
              )}
              {p.kind === "toggle" && <Toggle checked={value === true} onChange={(on) => set(p.id, on)} label={tc(p.label)} description={value ? t("params.on") : t("params.off")} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
