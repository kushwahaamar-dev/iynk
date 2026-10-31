export class TokenBucket {
  private tokens: number;
  private last: number;

  private readonly ratePerSec: number;
  private readonly burst: number;

  constructor(ratePerSec: number, burst: number, nowMs: number) {
    this.ratePerSec = ratePerSec;
    this.burst = burst;
    this.tokens = burst;
    this.last = nowMs;
  }

  take(nowMs: number): boolean {
    this.refill(nowMs);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  retryAfterMs(nowMs: number): number {
    this.refill(nowMs);
    if (this.tokens >= 1) return 0;
    return Math.ceil(((1 - this.tokens) / this.ratePerSec) * 1000);
  }

  private refill(nowMs: number): void {
    const elapsed = Math.max(0, nowMs - this.last);
    this.last = Math.max(this.last, nowMs);
    this.tokens = Math.min(this.burst, this.tokens + (elapsed / 1000) * this.ratePerSec);
  }
}
