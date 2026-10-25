"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LabStore } from "@/components/dock/types";
import type { FigureEvent } from "@/components/figure/protocol";
import type { BoardLabState } from "@/lib/boardlab/store";
import { isHydrating } from "@/lib/realtime";
import { useSettings } from "@/lib/settings/hooks";
import { setTelemetryContext, track } from "@/lib/telemetry";
import { playSound, setTone, silence } from "./index";
import { heldTones, type HeldTone, type Moment } from "./moments";
import type { CueSound } from "./sounds";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The `sfx` counter a figure puts in its state report: `{ n, name }`. */
function reportedSfx(state: unknown): { n: number; name: string | null } | null {
  const sfx = isRecord(state) ? state.sfx : null;
  if (!isRecord(sfx) || typeof sfx.n !== "number") return null;
  return { n: sfx.n, name: typeof sfx.name === "string" ? sfx.name : null };
}

/**
 * The figure's sounds, for a workspace's FigureFrame `onEvent`. Bench figures send an `sfx`
 * event per sound; drone figures only count them in their state reports (`sfx: { n, name }`),
 * so a rise in that count plays its name, until the figure shows it sends events itself.
 */
export function useFigureSound(): (event: FigureEvent) => void {
  const seen = useRef({ events: false, n: -1 });
  return useCallback((event: FigureEvent) => {
    const at = seen.current;
    if (event.type === "sfx") {
      at.events = true;
      playSound(event.name);
      return;
    }
    if (event.type !== "ready" && event.type !== "state") return;
    const sfx = reportedSfx(event.state);
    if (!sfx) return;
    // `ready` (the figure loaded or reloaded) sets the count without playing what came before.
    if (event.type === "state" && !at.events && sfx.n > at.n && at.n >= 0 && sfx.name) playSound(sfx.name);
    at.n = sfx.n;
  }, []);
}

const CUES: Partial<Record<Moment["kind"], CueSound>> = { pass: "pass", fail: "fail", step: "step", refused: "refused" };

function report(moment: Moment) {
  const cue = CUES[moment.kind];
  if (cue) playSound(cue);
  // Anonymous: the progress key or failure id, never code, names or what someone typed.
  if (moment.kind === "attempt") track("lesson.attempt", { key: moment.key });
  else if (moment.kind === "pass") track("lesson.pass", { key: moment.key });
  else if (moment.kind === "fault") track("fault", { code: moment.code });
}

/**
 * Plays a cue and records a telemetry event for each moment `derive` reads from the store's
 * changes, and stamps `item` on this page's telemetry. A room joiner taking the host's
 * snapshot is skipped, so catching up doesn't replay every step.
 */
export function useLabMoments<S>(store: LabStore<S>, derive: (prev: S, next: S) => Moment[], item: string): void {
  useEffect(() => {
    setTelemetryContext({ item });
    return () => setTelemetryContext({ item: undefined });
  }, [item]);

  useEffect(() => {
    let prev = store.getState();
    return store.subscribe(() => {
      const next = store.getState();
      if (next === prev) return;
      const before = prev;
      prev = next;
      if (isHydrating()) return;
      for (const moment of derive(before, next)) report(moment);
    });
  }, [store, derive]);
}

/** Plays what a lesson's buzzer plays while the sketch runs (see `heldTones`). */
export function useSketchTones(store: LabStore<BoardLabState>): void {
  const { sound } = useSettings();
  useEffect(() => {
    if (!sound) return;
    let playing = new Map<string, HeldTone>();
    const sync = () => {
      const next = heldTones(store.getState());
      for (const id of playing.keys()) if (!next.has(id)) setTone(id, null);
      for (const [id, tone] of next) {
        const was = playing.get(id);
        if (was?.hz !== tone.hz || was.loud !== tone.loud) setTone(id, tone.hz, tone.loud);
      }
      playing = next;
    };
    sync();
    const off = store.subscribe(sync);
    return () => {
      off();
      silence();
    };
  }, [store, sound]);
}
