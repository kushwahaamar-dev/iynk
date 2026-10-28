/** A token bucket: `rate` tokens per second, holding at most `burst`. Times are performance.now() ms. */
export class TokenBucket {
  /** @param {number} rate @param {number} burst @param {number} now */
  constructor(rate, burst, now) {
    this.perMs = rate / 1000;
    this.burst = burst;
    this.tokens = burst;
    this.at = now;
  }

  /** Takes one token; false when the bucket is empty. @param {number} now */
  take(now) {
    const tokens = Math.min(this.burst, this.tokens + (now - this.at) * this.perMs);
    this.at = now;
    if (tokens < 1) {
      this.tokens = tokens;
      return false;
    }
    this.tokens = tokens - 1;
    return true;
  }
}
