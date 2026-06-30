interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  sweepIntervalMs?: number;
}

interface RateLimiterEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private map = new Map<string, RateLimiterEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private sweepInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    const sweepMs = options.sweepIntervalMs ?? Math.max(options.windowMs * 5, 5 * 60_000);
    this.sweepInterval = setInterval(() => this.sweep(), sweepMs);
    if (this.sweepInterval.unref) this.sweepInterval.unref();
  }

  /**
   * Returns true if the key is within the allowed limit, false if rate-limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    let entry = this.map.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 1, resetAt: now + this.windowMs };
      this.map.set(key, entry);
      return true;
    }
    entry.count += 1;
    return entry.count <= this.maxRequests;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now >= entry.resetAt) {
        this.map.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.sweepInterval !== null) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.map.clear();
  }
}
