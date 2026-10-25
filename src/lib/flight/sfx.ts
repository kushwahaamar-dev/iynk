import type { FlightEvent } from "./types";

/** The sound effects a figure may name (docs/FIGURES-DRONE.md, `sfx`); the host's sound engine plays them (S10). */
export type SfxName = "place" | "whoosh" | "tick" | "click" | "unplug" | "power" | "pop" | "sizzle" | "buzz" | "ding" | "spin";

/** What the host plays for a flight event, in order; null = nothing. */
export function sfxFor(e: FlightEvent): SfxName[] | null {
  switch (e.type) {
    case "armed":
      return ["power"];
    case "disarmed":
      return ["unplug"];
    case "crash":
      return ["pop", "sizzle"];
    case "desync":
    case "motorOut":
      return ["pop"];
    case "landed":
    case "lap":
    case "run":
    case "missionDone":
      return ["ding"];
    case "gate":
    case "checkpoint":
    case "missionStep":
      return ["tick"];
    case "drop":
      return ["unplug"];
    case "battery":
      return [e.level === "empty" ? "unplug" : "buzz"];
    case "blocked":
    case "stall":
    case "outOfField":
    case "farOut":
      return ["buzz"];
    case "launch":
    case "transition":
      return ["whoosh"];
    case "mode":
      return ["click"];
    default:
      return null;
  }
}
