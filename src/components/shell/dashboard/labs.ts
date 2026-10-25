import type { ComponentProps } from "react";
import type { FigureStill } from "@/components/figure";
import type { ChipTone } from "@/components/ui/Chip";
import type { IconName } from "@/components/ui/icons";
import type { ProgressLab } from "@/lib/progress/keys";

type LabLook = { tone: ChipTone; band: string; icon: IconName; still: ComponentProps<typeof FigureStill>["item"] };

/**
 * Each lab's colour and icon, used wherever the dashboard names a lab, and the figure its landing card shows: one the
 * hero (the Uno on its breadboard) doesn't.
 */
export const LAB_LOOK: Record<ProgressLab, LabLook> = {
  board: { tone: "cobalt", band: "bg-cobalt", icon: "board", still: "boards/basys3" },
  robotics: { tone: "mint", band: "bg-mint", icon: "robot", still: "robotics/tb6612fng" },
  drone: { tone: "tomato", band: "bg-tomato", icon: "drone", still: "drones/quad5" },
};
