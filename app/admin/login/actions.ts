"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { adminAuth } from "@/lib/firebase/admin";

// Only mint a session from a sign-in that just happened, not a replayed old token.
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export type CreateSessionResult = { error: string };

export async function createSession(
  idToken: unknown,
): Promise<CreateSessionResult> {
  const parsed = z.string().min(1).max(4096).safeParse(idToken);
  if (!parsed.success) return { error: "Sign-in failed. Please try again." };

  try {
    const decoded = await adminAuth().verifyIdToken(parsed.data, true);

    if (decoded.admin !== true) {
      return { error: "This account does not have admin access." };
    }
    if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
      return { error: "Sign-in expired. Please sign in again." };
    }

    const sessionCookie = await adminAuth().createSessionCookie(parsed.data, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch (error) {
    console.error("createSession failed", error);
    return { error: "Sign-in failed. Please try again." };
  }

  redirect("/admin");
}
