import type { ParTimes } from "@/content/schema";
import { medalFor, type Medal } from "./registry";

/** Which physics flies the craft: the tuned game model, or the rigid-body one (B19). */
export type FlightModelId = "flight-game@1" | "multirotor-rigid@1";

export const DEFAULT_MODEL: FlightModelId = "flight-game@1";

/** Added to a storage key so another model never reads the game model's ghosts. Empty for the game model. */
export function modelSuffix(m: FlightModelId): string {
  return m === DEFAULT_MODEL ? "" : "@rigid1";
}

/** Medal times are set for the factory craft on the game model, so no other model earns one. */
export function medalForModel(m: FlightModelId, time: number, par: ParTimes | null): Medal | null {
  return m === DEFAULT_MODEL ? medalFor(time, par) : null;
}
