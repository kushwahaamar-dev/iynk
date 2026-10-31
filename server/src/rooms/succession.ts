import type { Actor, Role } from "../../../src/protocol/frames.ts";
import type { Timers } from "./baton.ts";

export type Present = { actor: Actor; role: Role; presentSince: number; spectator: boolean };

export class HostSuccession {
  readonly #timers: Timers;
  readonly #graceMs: number;
  #cancel: (() => void) | null = null;

  constructor(timers: Timers, graceMs: number) {
    this.#timers = timers;
    this.#graceMs = graceMs;
  }

  hostLeft(onExpire: () => void): void {
    this.hostBack();
    this.#cancel = this.#timers.set(() => {
      this.#cancel = null;
      onExpire();
    }, this.#graceMs);
  }

  hostBack(): void {
    this.#cancel?.();
    this.#cancel = null;
  }

  pick(present: readonly Present[]): Actor | null {
    for (const role of ["owner", "editor"] as const) {
      const eldest = present
        .filter((p) => p.role === role && !p.spectator)
        .reduce<Present | null>((best, p) => (best === null || p.presentSince < best.presentSince ? p : best), null);
      if (eldest) return eldest.actor;
    }
    return null;
  }
}
