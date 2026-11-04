"use server";

import type { DecodedIdToken } from "firebase-admin/auth";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  MEMBER_SESSION_COOKIE,
  MEMBER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { getMember } from "@/lib/auth/member-dal";
import { endSession, startSession, verifyFreshSignIn } from "@/lib/auth/session";
import {
  cancelMemberBooking,
  type CancelMemberBookingResult,
} from "@/lib/booking/member-bookings";
import { docIdSchema } from "@/lib/booking/schemas";
import { bookingRepository } from "@/lib/booking/server";
import { clientKey } from "@/lib/client-key";
import { adminDb } from "@/lib/firebase/admin";
import { deleteMember } from "@/lib/members/delete";
import {
  ensureMember,
  updateMemberProfile,
} from "@/lib/members/repository";
import { memberNameSchema, profileFormSchema } from "@/lib/members/schemas";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  cancelMemberOrder,
  type CancelMemberOrderResult,
} from "@/lib/shop/member-orders";
import { orderRepository } from "@/lib/shop/server";
import type { MemberProfile } from "@/types/member";

// Firebase rate-limits the password checks itself; this only stops a script
// minting sessions in a loop.
const sessionLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

export type MemberSignInResult =
  | { ok: true; member: MemberProfile }
  | { ok: false; error: string };

// Called by the browser right after a Firebase sign-in (password or Google).
// `signUpName` is the name typed on the "Create account" form; it is only
// used when the member document doesn't exist yet.
export async function startMemberSession(
  idToken: unknown,
  signUpName?: unknown,
): Promise<MemberSignInResult> {
  if (!sessionLimiter.hit(await clientKey())) {
    return {
      ok: false,
      error: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const signIn = await verifyFreshSignIn(idToken);
  if (!signIn.ok) {
    return {
      ok: false,
      error:
        signIn.reason === "expired"
          ? "Sign-in expired. Please sign in again."
          : "Sign-in failed. Please try again.",
    };
  }

  const { token } = signIn;
  if (token.admin === true) {
    return {
      ok: false,
      error:
        "This email is the salon's admin account. Use a different email for a member account.",
    };
  }
  if (!token.email) {
    return {
      ok: false,
      error: "Your account has no email address. Try another way to sign in.",
    };
  }

  try {
    const member = await ensureMember(adminDb(), {
      uid: token.uid,
      email: token.email.toLowerCase(),
      name: initialName(token, signUpName),
    });
    await startSession(
      MEMBER_SESSION_COOKIE,
      signIn.idToken,
      MEMBER_SESSION_MAX_AGE_SECONDS,
    );
    // Server Components that read the session (account page, booking page)
    // re-render; client state such as a half-finished booking is kept.
    refresh();
    return {
      ok: true,
      member: { name: member.name, email: member.email, phone: member.phone },
    };
  } catch (error) {
    console.error("startMemberSession failed", error);
    return { ok: false, error: "Sign-in failed. Please try again." };
  }
}

// Typed name (sign-up) → Google profile name → the part of the email before @.
function initialName(token: DecodedIdToken, signUpName: unknown): string {
  for (const candidate of [signUpName, token.name]) {
    const parsed = memberNameSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
  }
  return token.email!.split("@")[0].slice(0, 80);
}

export type ProfileResult =
  | { status: "saved" }
  | { status: "invalid"; fieldErrors: Partial<Record<string, string[]>> }
  | { status: "error"; message: string };

export async function saveProfile(formData: FormData): Promise<ProfileResult> {
  const member = await getMember();
  if (!member) {
    return { status: "error", message: "Please sign in again." };
  }

  const parsed = profileFormSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "invalid",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    await updateMemberProfile(adminDb(), member.uid, parsed.data);
  } catch (error) {
    console.error("saveProfile failed", error);
    return { status: "error", message: "Couldn't save. Please try again." };
  }
  refresh();
  return { status: "saved" };
}

// Stays on the current page (the account page shows the sign-in form again;
// the booking page falls back to the guest form).
export async function signOutMember(): Promise<void> {
  await endSession(MEMBER_SESSION_COOKIE);
  refresh();
}

// Cancels one of the signed-in member's own bookings (same cut-off as the
// manage link).
export async function cancelBookingAsMember(
  bookingId: unknown,
): Promise<CancelMemberBookingResult> {
  const member = await getMember();
  if (!member) return { ok: false, error: "Please sign in again." };
  const id = docIdSchema.safeParse(bookingId);
  if (!id.success) return { ok: false, error: "We couldn't find that booking." };

  try {
    const result = await cancelMemberBooking(
      bookingRepository(),
      member.uid,
      id.data,
      new Date(),
    );
    if (result.ok) refresh();
    return result;
  } catch (error) {
    console.error("cancelBookingAsMember failed", error);
    return { ok: false, error: "Couldn't cancel. Please try again." };
  }
}

// Cancels one of the signed-in member's own orders (only while it's still
// being prepared, as with the order link).
export async function cancelOrderAsMember(
  orderId: unknown,
): Promise<CancelMemberOrderResult> {
  const member = await getMember();
  if (!member) return { ok: false, error: "Please sign in again." };
  const id = docIdSchema.safeParse(orderId);
  if (!id.success) return { ok: false, error: "We couldn't find that order." };

  try {
    const result = await cancelMemberOrder(
      orderRepository(),
      member.uid,
      id.data,
      new Date(),
    );
    if (result.ok) refresh();
    return result;
  } catch (error) {
    console.error("cancelOrderAsMember failed", error);
    return { ok: false, error: "Couldn't cancel. Please try again." };
  }
}

export type DeleteAccountResult = { error: string };

export async function deleteAccount(
  confirmation: unknown,
): Promise<DeleteAccountResult> {
  const member = await getMember();
  if (!member) return { error: "Please sign in again." };
  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  try {
    await deleteMember(member.uid);
    await endSession(MEMBER_SESSION_COOKIE);
  } catch (error) {
    console.error("deleteAccount failed", error);
    return { error: "Couldn't delete your account. Please try again." };
  }

  redirect("/account?deleted=1");
}
