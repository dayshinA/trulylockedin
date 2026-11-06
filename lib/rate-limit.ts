import "server-only";

import { createHash } from "node:crypto";

import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";

// Sliding-window limiter shared by every server instance (serverless hosts run
// many), stored in Firestore at rateLimits/{name}-{hash of the key}:
//   { hits: number[] (ms), expiresAt: Timestamp }
// The key is usually the client's IP; only its sha256 is stored. A TTL policy
// on expiresAt (firestore.indexes.json) deletes idle docs, usually within a
// day of expiry. Each check is one transaction: 1 read + 1 write.
export type RateLimiter = {
  // Records an attempt and reports whether it is within the limit.
  hit(key: string, now?: number): Promise<boolean>;
};

const COLLECTION = "rateLimits";

// When Firestore is unreachable the client retries instead of failing, so a
// check that takes longer than this counts as a failure.
const TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
  });
  // A late transaction may still finish; its outcome is ignored.
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createRateLimiter({
  name,
  limit,
  windowMs,
}: {
  // Separates limiters that share a key (e.g. "booking" vs "booking-lookup").
  name: string;
  limit: number;
  windowMs: number;
}): RateLimiter {
  return {
    async hit(key, now = Date.now()) {
      const hash = createHash("sha256").update(key).digest("base64url");
      const db = adminDb();
      const ref = db.collection(COLLECTION).doc(`${name}-${hash}`);
      const cutoff = now - windowMs;
      try {
        return await withTimeout(db.runTransaction(async (tx) => {
          const stored: unknown = (await tx.get(ref)).get("hits");
          const recent = (Array.isArray(stored) ? stored : []).filter(
            (t): t is number => typeof t === "number" && t > cutoff,
          );
          // Refused attempts aren't recorded, so the window still ends.
          if (recent.length >= limit) return false;
          recent.push(now);
          tx.set(ref, {
            hits: recent,
            expiresAt: Timestamp.fromMillis(now + windowMs),
          });
          return true;
        }), TIMEOUT_MS);
      } catch (error) {
        // Fail closed. Every limited action needs Firestore anyway, so allowing
        // it gains nothing during an outage, while failing open would let a
        // burst of parallel requests (queued on this one doc until they time
        // out) skip the limit. console.error reaches Sentry.
        console.error(`Rate limit check failed (${name}); refused`, error);
        return false;
      }
    },
  };
}
