export type Clock = { now(): number };

export type Ids = { random(bytes: number): Uint8Array };

export type Sleep = (ms: number) => Promise<void>;

export type Deps = { clock: Clock; ids: Ids; sleep: Sleep };

export function realDeps(): Deps {
  return {
    clock: { now: () => Date.now() },
    ids: { random: (bytes) => crypto.getRandomValues(new Uint8Array(bytes)) },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
