import "server-only";

import { headers } from "next/headers";

// Where Stripe sends customers back to. Server Action requests carry an
// Origin that Next has already checked against the host.
export async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return (
    origin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}
