import "server-only";
import type { LabKind } from "@/components/dock/types";

export const LABS = ["board", "robotics", "drone"] as const satisfies readonly LabKind[];
