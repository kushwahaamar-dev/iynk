import type { ComponentProps } from "react";
import type { FigureStill } from "@/components/figure";
import type { ProgressLab } from "@/lib/progress/keys";

type Still = ComponentProps<typeof FigureStill>["item"];

/** The shelf order: the wide cell first, then the two stacked beside it. */
export const LAB_ORDER: readonly ProgressLab[] = ["board", "robotics", "drone"];

export const BENEFIT_IDS = ["see", "code", "break", "fly"] as const;

export type BenefitId = (typeof BENEFIT_IDS)[number];

/** The still beside each benefit row. */
export const BENEFIT_STILL: Record<BenefitId, Still> = {
  see: "boards/uno-r3",
  code: "boards/pico",
  break: "robotics/led-resistor",
  fly: "drones/quad5",
};
