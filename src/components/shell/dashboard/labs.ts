import type { ChipTone } from "@/components/ui/Chip";
import type { IconName } from "@/components/ui/icons";
import type { ProgressLab } from "@/lib/progress/keys";

/** Each lab's colour and icon, used wherever the dashboard names a lab. */
export const LAB_LOOK: Record<ProgressLab, { tone: ChipTone; band: string; icon: IconName }> = {
  board: { tone: "cobalt", band: "bg-cobalt", icon: "board" },
  robotics: { tone: "mint", band: "bg-mint", icon: "robot" },
  drone: { tone: "tomato", band: "bg-tomato", icon: "drone" },
};
