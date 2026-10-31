import type { DroneContent } from "@/content/schema";
import type { HostCommand } from "@/components/figure/protocol";
import type { LabStore } from "@/components/dock/types";
import { initialState, reduce, type DroneLabAction, type DroneLabState } from "./workshop";

export * from "./workshop";

export type DroneLabStore = LabStore<DroneLabState, DroneLabAction> & {
  /** Where figure commands go: FigureFrame's handle.send. Returns a disconnect function. */
  connect(sink: (command: HostCommand) => void): () => void;
  /** Every dispatched action with the commands it sent, for observers (rooms, replays). */
  observe(listener: (action: DroneLabAction, send: HostCommand[]) => void): () => void;
};

export function createDroneLabStore(content: DroneContent, init: DroneLabState = initialState(content)): DroneLabStore {
  let state = init;
  let sink: ((command: HostCommand) => void) | null = null;
  const listeners = new Set<() => void>();
  const observers = new Set<(action: DroneLabAction, send: HostCommand[]) => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const step = reduce(content, state, action);
      const changed = step.state !== state;
      state = step.state;
      for (const command of step.send) sink?.(command);
      for (const o of observers) o(action, step.send);
      if (changed) for (const l of listeners) l();
    },
    connect(next) {
      sink = next;
      return () => {
        if (sink === next) sink = null;
      };
    },
    observe(listener) {
      observers.add(listener);
      return () => observers.delete(listener);
    },
  };
}
