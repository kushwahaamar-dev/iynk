"use client";

import { cx } from "@/components/ui/cx";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

type Meas = Record<string, { i_mA?: number; state?: string }>;

// The bench's per-LED measurement states (FIGURES-BENCH §13).
const MEAS_STATES = ["ok", "off", "burnt", "reverse", "open"];

/**
 * What the figure reports, as text: on-board LEDs on or off, and each circuit
 * LED's current and state (lit, dark, burnt, backwards). Colour in the figure is never
 * the only way to read it.
 */
export function FigureReadout({ store, leds }: { store: BoardLabStore; leds: { id: string; label: string }[] }) {
  const { t } = useText();
  const reported = useLab(store, (s) => s.figure.leds) as Record<string, number> | undefined;
  const meas = useLab(store, (s) => s.figure.meas) as Meas | undefined;
  const ledItems = leds.filter((l) => reported && l.id in reported);
  const measItems = Object.entries(meas ?? {});
  if (ledItems.length === 0 && measItems.length === 0) return null;
  return (
    <ul aria-label={t("readout.label")} className="flex flex-wrap gap-2 text-sm" data-testid="figure-readout">
      {ledItems.map((l) => {
        const on = Number(reported![l.id]) > 0;
        return (
          <li key={l.id} className={cx("rounded-full border-2 px-3 py-1", on ? "border-mustard-m bg-mustard/25" : "border-line")} data-led={l.id} data-on={on ? 1 : 0}>
            {t(on ? "readout.ledOn" : "readout.ledOff", { led: l.label })}
          </li>
        );
      })}
      {measItems.map(([part, m]) => {
        const state = m.state && MEAS_STATES.includes(m.state) ? m.state : "off";
        return (
          <li key={part} className={cx("rounded-full border-2 px-3 py-1", state === "burnt" ? "on-fill border-bad bg-bad-bg" : state === "ok" ? "border-good" : "border-line")} data-part={part} data-state={state}>
            {t(`readout.part.${state}` as Parameters<typeof t>[0], { part, ma: Math.round((m.i_mA ?? 0) * 10) / 10 })}
          </li>
        );
      })}
    </ul>
  );
}
