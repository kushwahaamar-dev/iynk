import { randomBytes } from "node:crypto";
import { toBase64Url } from "../../../src/protocol/identity.ts";

/** Every nonce lives the same time, so map insertion order is expiry order. */
export class NonceStore {
  private readonly pending = new Map<string, number>();

  private readonly clock: () => number;
  private readonly ttlMs: number;

  constructor(clock: () => number, ttlMs: number) {
    this.clock = clock;
    this.ttlMs = ttlMs;
  }

  issue(): { nonce: string; at: number } {
    const at = this.clock();
    this.evict(at);
    const nonce = toBase64Url(randomBytes(32));
    this.pending.set(nonce, at + this.ttlMs);
    return { nonce, at };
  }

  consume(nonce: string): boolean {
    const expiresAt = this.pending.get(nonce);
    if (expiresAt === undefined) return false;
    this.pending.delete(nonce);
    return expiresAt > this.clock();
  }

  private evict(now: number): void {
    for (const [nonce, expiresAt] of this.pending) {
      if (expiresAt > now) break;
      this.pending.delete(nonce);
    }
  }
}
