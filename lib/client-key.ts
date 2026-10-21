import "server-only";

import { headers } from "next/headers";

// Identifies the caller for the public rate limits. The reverse proxy in front
// of `next start` must set (overwrite) these headers, otherwise a client could
// spoof them to dodge the limit.
export async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
