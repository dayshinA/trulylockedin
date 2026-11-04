import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { z } from "zod";

import { adminAuth } from "@/lib/firebase/admin";

// Only mint a session from a sign-in that just happened, not a replayed old token.
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export type FreshSignIn =
  | { ok: true; token: DecodedIdToken; idToken: string }
  | { ok: false; reason: "invalid" | "expired" };

// Checks an ID token sent by the client right after a Firebase sign-in:
// signature, revocation and that the sign-in itself is recent.
export async function verifyFreshSignIn(idToken: unknown): Promise<FreshSignIn> {
  const parsed = z.string().min(1).max(4096).safeParse(idToken);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const token = await adminAuth().verifyIdToken(parsed.data, true);
    if (Date.now() / 1000 - token.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, token, idToken: parsed.data };
  } catch (error) {
    console.error("verifyFreshSignIn failed", error);
    return { ok: false, reason: "invalid" };
  }
}

// Exchanges the ID token for a Firebase session cookie and stores it httpOnly.
export async function startSession(
  cookieName: string,
  idToken: string,
  maxAgeSeconds: number,
): Promise<void> {
  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: maxAgeSeconds * 1000,
  });

  (await cookies()).set(cookieName, sessionCookie, {
    httpOnly: true,
    // ADMIN_COOKIE_SECURE=false lets sessions work over plain http (bare-IP
    // demo). It applies to the member cookie too.
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.ADMIN_COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

// Deletes the cookie and signs the user out on every device.
export async function endSession(cookieName: string): Promise<void> {
  const jar = await cookies();
  const sessionCookie = jar.get(cookieName)?.value;
  jar.delete(cookieName);
  if (!sessionCookie) return;

  try {
    const { uid } = await adminAuth().verifySessionCookie(sessionCookie);
    await adminAuth().revokeRefreshTokens(uid);
  } catch {
    // Already expired or revoked: nothing left to revoke.
  }
}
