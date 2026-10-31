"use client";

import { SegmentedControl } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";

export type SpeedT = Translate<Messages["instruments"]>;

/** Simulated seconds per wall second; 0 is as fast as the device allows. */
export const SPEED_PRESETS = [0.1, 1, 10, 100, 0] as const;

const valueOf = (speed: number): string => (speed === 0 ? "max" : String(speed));

/** Two significant digits, so 19.6 reads as 20 and 3.14 as 3.1. */
const roughly = (x: number): number => Number(x.toPrecision(2));

export interface SpeedControlProps {
  t: SpeedT;
  speed: number;
  achieved: number;
  behind: boolean;
  onChange(speed: number): void;
}

export function SpeedControl({ t, speed, achieved, behind, onChange }: SpeedControlProps) {
  const options = SPEED_PRESETS.map((preset) => ({
    value: valueOf(preset),
    label: preset === 0 ? t("speed.max") : t("speed.preset", { x: preset }),
  }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        label={t("speed.label")}
        size="sm"
        options={options}
        value={valueOf(speed)}
        onChange={(value) => onChange(value === "max" ? 0 : Number(value))}
      />
      <p className="text-sm text-warn tabular-nums" aria-live="polite">
        {behind ? t("speed.behind", { x: roughly(achieved) }) : null}
      </p>
    </div>
  );
}
