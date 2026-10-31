import type { Actor } from "../../../src/protocol/frames.ts";

export interface Timers {
  /** Runs `fn` after `ms` and returns the cancel function. Tests pass a virtual clock. */
  set(fn: () => void, ms: number): () => void;
}

export class Baton {
  readonly #timers: Timers;
  readonly #holdMs: number;
  #holder: Actor | null;
  #cancel: (() => void) | null = null;

  constructor(holder: Actor | null, timers: Timers, holdMs: number) {
    this.#holder = holder;
    this.#timers = timers;
    this.#holdMs = holdMs;
  }

  get holder(): Actor | null {
    return this.#holder;
  }

  request(by: Actor): { granted: boolean; askedOf: Actor | null } {
    if (this.#holder === null || this.#holder === by) {
      this.take(by);
      return { granted: true, askedOf: null };
    }
    return { granted: false, askedOf: this.#holder };
  }

  grant(to: Actor): void {
    this.#stopTimer();
    this.#holder = to;
  }

  release(): void {
    this.#stopTimer();
    this.#holder = null;
  }

  take(by: Actor): void {
    this.grant(by);
  }

  disconnected(actor: Actor, onFree: () => void): void {
    if (this.#holder !== actor) return;
    this.#stopTimer();
    this.#cancel = this.#timers.set(() => {
      this.#cancel = null;
      this.#holder = null;
      onFree();
    }, this.#holdMs);
  }

  reconnected(actor: Actor): void {
    if (this.#holder === actor) this.#stopTimer();
  }

  #stopTimer(): void {
    this.#cancel?.();
    this.#cancel = null;
  }
}
