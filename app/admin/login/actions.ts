"use server";

import { redirect } from "next/navigation";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { startSession, verifyFreshSignIn } from "@/lib/auth/session";

export type CreateSessionResult = { error: string };

export async function createSession(
  idToken: unknown,
): Promise<CreateSessionResult> {
  const signIn = await verifyFreshSignIn(idToken);
  if (!signIn.ok) {
    return {
      error:
        signIn.reason === "expired"
          ? "Sign-in expired. Please sign in again."
          : "Sign-in failed. Please try again.",
    };
  }
  if (signIn.token.admin !== true) {
    return { error: "This account does not have admin access." };
  }

  try {
    await startSession(SESSION_COOKIE, signIn.idToken, SESSION_MAX_AGE_SECONDS);
  } catch (error) {
    console.error("createSession failed", error);
    return { error: "Sign-in failed. Please try again." };
  }

  redirect("/admin");
}
