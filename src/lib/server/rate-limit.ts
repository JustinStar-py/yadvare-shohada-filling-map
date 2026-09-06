import { NextRequest } from "next/server";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Classic token-bucket rate limiter: allows short bursts up to `capacity`
 * while enforcing a sustained rate of `refillPerSecond` requests.
 * All state is in-memory; keyed per caller (e.g. client IP).
 */
class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweepAt = 0;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly idleTtlMs: number = 30 * 60 * 1000
  ) {}

  tryConsume(key: string, cost: number = 1): boolean {
    this.sweepIfNeeded();

    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);
    bucket.lastRefill = now;

    if (bucket.tokens < cost) return false;
    bucket.tokens -= cost;
    return true;
  }

  private sweepIfNeeded(): void {
    const now = Date.now();
    if (this.buckets.size < 1000 || now - this.lastSweepAt < 60_000) return;
    this.lastSweepAt = now;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > this.idleTtlMs) this.buckets.delete(key);
    }
  }
}

function globalSingleton<T>(key: string, factory: () => T): T {
  const store = globalThis as unknown as Record<string, unknown>;
  if (!store[key]) store[key] = factory();
  return store[key] as T;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Public submissions: reciting one salawat takes ~2.5s, so the sustained rate
// is 1 request / 2.5s per IP with a small burst allowance for UI jitter.
export const salawatLimiter = globalSingleton(
  "__salawatRateLimiter",
  () => new TokenBucketRateLimiter(3, 1 / 2.5)
);

// Admin PIN brute-force protection: 5 attempts per 15 minutes per IP
export const adminAuthLimiter = globalSingleton(
  "__adminAuthRateLimiter",
  () => new TokenBucketRateLimiter(5, 1 / (15 * 60))
);

// Public launch sealing: rare ceremony trigger — generous burst, slow refill
export const publicLaunchLimiter = globalSingleton(
  "__publicLaunchLimiter",
  () => new TokenBucketRateLimiter(5, 0.1)
);
