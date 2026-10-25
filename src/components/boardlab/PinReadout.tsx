"use client";

import { cx } from "@/components/ui/cx";
import type { BoardLabStore } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

/** Live pin values as text (never colour alone): "D13: HIGH", "D9: PWM 61%". Shown while the sketch runs. */
export function PinReadout({ store }: { store: BoardLabStore }) {
  const { t } = useText();
  const pins = useLab(store, (s) => s.pins);
  const status = useLab(store, (s) => s.run.status);
  const entries = Object.entries(pins).filter(([, p]) => p.mode === "output" || p.mode === "open_drain" || p.pwm);
  if (status !== "running" || entries.length === 0) return null;
  return (
    <ul aria-label={t("view.statusLabel")} className="flex shrink-0 gap-1.5 font-ui text-xs" data-testid="pin-readout">
      {entries.map(([net, p]) => {
        const value = p.pwm && p.value > 0 && p.value < 1 ? t("view.pwm", { pct: Math.round(p.value * 100) }) : p.value >= 0.5 ? t("view.high") : t("view.low");
        const high = p.value >= 0.5;
        return (
          <li
            key={net}
            className={cx("tabular whitespace-nowrap rounded-full border-[1.5px] px-2.5 py-1", high ? "border-tomato-m bg-tomato/20" : "border-rule bg-sunken")}
            data-pin={net}
            data-level={high ? 1 : 0}
          >
            {t("view.pinLive", { pin: net, value })}
          </li>
        );
      })}
    </ul>
  );
}
