"use client";

import type { Mode } from "@/ai/modes";
import { SegmentedControl } from "@/components/ui";
import type { AiT } from "./ToolCard";

const MODES: readonly Mode[] = ["direct", "debugging", "beginner"];

/** Direct, debugging or beginner, with the hint for the one that is chosen. */
export function ModeSwitch({ mode, onChange, t }: { mode: Mode; onChange: (mode: Mode) => void; t: AiT }) {
  return (
    <div className="space-y-1">
      <SegmentedControl
        label={t("partner.mode.label")}
        size="sm"
        stretch
        value={mode}
        onChange={onChange}
        options={MODES.map((value) => ({ value, label: t(`partner.mode.${value}.name`) }))}
      />
      <p className="text-xs text-muted">{t(`partner.mode.${mode}.hint`)}</p>
    </div>
  );
}
