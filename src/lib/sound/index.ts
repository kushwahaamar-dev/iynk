// SimLab's sound (BUILD-PLAN §3.1): figure sound effects and lab cues on Web Audio,
// off until the learner turns `settings.sound` on. Every call is cheap, synchronous
// and safe on the server; with sound off or no Web Audio it does nothing.

import { getSettings } from "@/lib/settings/settings";
import { SoundEngine } from "./engine";
import { isSoundName, type SoundName } from "./sounds";

export { CUE_SOUNDS, FIGURE_SOUNDS, isSoundName, type CueSound, type FigureSound, type SoundName } from "./sounds";

let engine: SoundEngine | null = null;

function shared(): SoundEngine | null {
  if (typeof window === "undefined") return null;
  engine ??= new SoundEngine();
  return engine;
}

export function soundOn(): boolean {
  return typeof window !== "undefined" && getSettings().sound;
}

/** Plays a named sound if sound is on. Unknown names (a newer figure's) are ignored. */
export function playSound(name: string): void {
  if (!soundOn() || !isSoundName(name)) return;
  shared()?.play(name as SoundName);
}

/** Holds a pitch under `id` (a buzzer pin), retunes it, or stops it with null. */
export function setTone(id: string, hz: number | null): void {
  if (hz !== null && !soundOn()) hz = null;
  if (hz === null && !engine) return;
  shared()?.tone(id, hz);
}

/** From the click that turns sound on: lets the browser start audio, then says it's on. */
export function startSound(): void {
  shared()?.unlock();
  playSound("on");
}

/** Stops every held tone. */
export function silence(): void {
  engine?.silence();
}
