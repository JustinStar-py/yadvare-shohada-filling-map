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
  if (forwarded) {
    // The rightmost hop is appended by our own trusted reverse proxy and
    // cannot be spoofed by clients; leftmost values are attacker-controllable
    // (a client can send its own XFF header that proxies merely append to).
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Public submissions: individual visitor limiter (burst 4, refill 1/4s)
export const salawatVisitorLimiter = globalSingleton(
  "__salawatVisitorLimiter",
  () => new TokenBucketRateLimiter(4, 0.25)
);

// Outer IP floodgate: protects against volumetric floods while supporting ~60 users on shared NAT/Wi-Fi
export const salawatIpFloodgate = globalSingleton(
  "__salawatIpFloodgate",
  () => new TokenBucketRateLimiter(120, 2)
);

// Backward-compatibility alias
export const salawatLimiter = salawatVisitorLimiter;

export function checkSalawatRateLimit(
  req: NextRequest,
  visitorId?: string
): { allowed: boolean; retryAfter?: number } {
  const ip = getClientIp(req);
  if (!salawatIpFloodgate.tryConsume(ip)) {
    return { allowed: false, retryAfter: 10 };
  }
  const visitorKey = visitorId ? `vis:${visitorId}` : `ip:${ip}`;
  if (!salawatVisitorLimiter.tryConsume(visitorKey)) {
    return { allowed: false, retryAfter: 4 };
  }
  return { allowed: true };
}

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
