// In-memory sliding-window limiter. Fine for one self-hosted instance; a second
// instance would need a shared store (e.g. Firestore or Redis).
export type RateLimiter = {
  // Records an attempt and reports whether it is within the limit.
  hit(key: string, now?: number): boolean;
};

export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  return {
    hit(key, now = Date.now()) {
      const cutoff = now - windowMs;

      // Drop idle keys now and then so the map can't grow without bound.
      if (now - lastSweep > windowMs) {
        for (const [k, times] of hits) {
          if (times[times.length - 1] <= cutoff) hits.delete(k);
        }
        lastSweep = now;
      }

      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
      const allowed = recent.length < limit;
      if (allowed) recent.push(now);
      hits.set(key, recent);
      return allowed;
    },
  };
}
