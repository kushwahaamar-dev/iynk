export const STALL_MS = 2000;

export type KillReason = "wall-stall" | "cancel-unanswered";

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface WatchdogDeps {
  timers: Timers;
  kill(reason: KillReason): Promise<void>;
}

export interface Watchdog {
  /** The worker showed life: the stall timer starts over. */
  beat(): void;
  /** A stop or cancel was sent: kill unless `disarm` comes within `STALL_MS`. */
  armCancel(): void;
  /** Stops both timers. */
  disarm(): void;
  /** True once a timer has fired, until the next `beat` or `armCancel`. */
  stalled(): boolean;
}

export function createWatchdog({ timers, kill }: WatchdogDeps): Watchdog {
  let stall: unknown;
  let cancel: unknown;
  let fired = false;

  const clear = () => {
    if (stall !== undefined) timers.clearTimeout(stall);
    if (cancel !== undefined) timers.clearTimeout(cancel);
    stall = cancel = undefined;
  };

  const fire = (reason: KillReason) => {
    clear();
    fired = true;
    void kill(reason);
  };

  return {
    beat() {
      fired = false;
      if (stall !== undefined) timers.clearTimeout(stall);
      stall = timers.setTimeout(() => fire("wall-stall"), STALL_MS);
    },
    armCancel() {
      fired = false;
      if (cancel !== undefined) timers.clearTimeout(cancel);
      cancel = timers.setTimeout(() => fire("cancel-unanswered"), STALL_MS);
    },
    disarm: clear,
    stalled: () => fired,
  };
}
