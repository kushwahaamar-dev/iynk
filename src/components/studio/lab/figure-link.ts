import type { FigureHandle, HostCommand } from "@/components/figure/protocol";
import type { FigureCommand } from "@/lib/robotics/session";

// The bridge carries only string and number data on `act`.
function actData(data: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) if (typeof value === "string" || typeof value === "number") out[key] = value;
  return out;
}

/** Sends a lab command to the figure. False when there is no figure; commands outside set, press, act and flash are ignored. */
export function sendToFigure(figure: FigureHandle | null, command: FigureCommand | HostCommand): boolean {
  if (!figure) return false;
  switch (command.type) {
    case "set":
      figure.send("set", { state: command.state });
      break;
    case "press":
      figure.send("press", command.choice === undefined ? { id: command.id } : { id: command.id, choice: command.choice });
      break;
    case "act":
      figure.send("act", command.data === undefined ? { name: command.name } : { name: command.name, data: actData(command.data) });
      break;
    case "flash":
      figure.send("flash", command.ms === undefined ? { text: command.text } : { text: command.text, ms: command.ms });
      break;
  }
  return true;
}
