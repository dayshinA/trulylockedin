import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

// The "Connect TikTok" round trip: /api/tiktok/connect sets a short-lived
// cookie with a random state and the exact redirect URI it sent to TikTok;
// /api/tiktok/callback checks the state (CSRF) and reuses the same URI, which
// TikTok requires to match when the code is exchanged.

export const STATE_COOKIE = "tli_tiktok_oauth";
export const STATE_COOKIE_PATH = "/api/tiktok";
export const STATE_MAX_AGE_SECONDS = 10 * 60;

const stateSchema = z.object({ state: z.string().min(1), redirectUri: z.url() });
export type OAuthState = z.infer<typeof stateSchema>;

export function newState(): string {
  return randomBytes(32).toString("base64url");
}

export function encodeState(value: OAuthState): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeState(cookie: string | undefined): OAuthState | null {
  if (!cookie) return null;
  try {
    const parsed = stateSchema.safeParse(
      JSON.parse(Buffer.from(cookie, "base64url").toString("utf8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function sameState(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// TIKTOK_REDIRECT_URI wins (e.g. a tunnel in development). Otherwise the
// callback on the host the owner is using, which must be one of the redirect
// URIs registered in the TikTok app (https only).
export function callbackUrl(request: NextRequest): string {
  const configured = process.env.TIKTOK_REDIRECT_URI;
  if (configured) return configured;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}/api/tiktok/callback`;
}

export function stateCookieSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ADMIN_COOKIE_SECURE !== "false"
  );
}
