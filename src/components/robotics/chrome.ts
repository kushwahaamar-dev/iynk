import type { RoboticsContent } from "@/content/schema";

// The figure button that does the job of each key a step's Do it sets.
const SET_BY: Record<string, string> = { power: "power", mode: "upload", matStep: "mat", build: "strip" };

/**
 * The figure's own buttons the bench page hides because the rail does their job: Break it (the rail's tab) and
 * every button a step's Do it sends (the mode picker is also the On the bench panel). The board's own buttons and
 * switches (`ctl-*`) stay, since the "Do this in the figure" steps press them (BOOT and RESET for download mode),
 * and so do Remove a part and View, which no step does. On a phone the HUD (`stats`) goes too and the drawing gets
 * the plate: the strip over the tabs and the Status tab show the same readings.
 */
export function benchChrome(bench: RoboticsContent, phone: boolean): string[] {
  const hide = new Set<string>();
  if (bench.faults.length > 0) hide.add("break");
  for (const { action } of bench.steps) {
    if (action?.type === "press" && !action.id.startsWith("ctl-")) hide.add(action.id);
    if (action?.type === "set") for (const key of Object.keys(action.state)) if (SET_BY[key]) hide.add(SET_BY[key]);
  }
  if (phone) hide.add("stats");
  return [...hide];
}
