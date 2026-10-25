import type { ComponentProps } from "react";
import type { FigureStill } from "@/components/figure";
import type { ProgressLab } from "@/lib/progress/keys";

/** The figure each lab shows on the landing: one the hero (the Uno on its breadboard) doesn't. */
export const LAB_STILL: Record<ProgressLab, ComponentProps<typeof FigureStill>["item"]> = {
  board: "boards/basys3",
  robotics: "robotics/tb6612fng",
  drone: "drones/quad5",
};
