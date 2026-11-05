"use server";

import { headers } from "next/headers";

import { getMember } from "@/lib/auth/member-dal";
import { abandonCheckout, fulfilCheckout } from "@/lib/booking/deposit";
import { holdTimes } from "@/lib/booking/deposit-rules";
import {
  cancelManagedBooking,
  findManagedBooking,
  findOwnBooking,
  type ManageCredentials,
  type ManageResult,
} from "@/lib/booking/manage";
import { bookingRepository } from "@/lib/booking/server";
import {
  findSlots,
  submitBooking,
  type FindSlotsResult,
  type SubmitBookingResult,
} from "@/lib/booking/submit";
import { clientKey } from "@/lib/client-key";
import { notifyBooking } from "@/lib/email/booking-emails";
import { rememberMemberPhone } from "@/lib/members/remember-phone";
import { createRateLimiter } from "@/lib/rate-limit";
import { createDepositCheckout } from "@/lib/stripe";

// Per-process; see lib/rate-limit.ts.
const bookingLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
// "Find my booking" (ref + email) guesses; the private link isn't limited.
const lookupLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const TOO_MANY_LOOKUPS: ManageResult = {
  ok: false,
  error: "Too many attempts. Please try again in a few minutes.",
};

async function lookupAllowed(input: ManageCredentials): Promise<boolean> {
  return !("email" in input) || lookupLimiter.hit(await clientKey());
}

// Live availability: request-time, never cached.
export async function getSlots(input: {
  serviceId: string;
  optionIds: string[];
  date: string;
}): Promise<FindSlotsResult> {
  return findSlots(bookingRepository(), input, new Date());
}

// Where Stripe sends the client back to. Server Action requests carry an
// Origin that Next has already checked against the host.
async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return (
    origin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

// Guests and members use the same form. A signed-in member's bookings are
// linked to their account, and the phone they used is remembered.
export async function createBooking(
  input: Record<string, unknown>,
): Promise<SubmitBookingResult> {
  const member = await getMember();
  const now = new Date();
  const siteUrl = await siteOrigin();
  const result = await submitBooking(bookingRepository(), input, {
    now,
    clientKey: await clientKey(),
    limiter: bookingLimiter,
    memberId: member?.uid,
    startCheckout: (booking) =>
      createDepositCheckout(booking, {
        siteUrl,
        expiresAt: holdTimes(now).checkoutExpiresAt,
      }),
  });

  if (result.ok && member) await rememberMemberPhone(member, input.phone);
  // A held booking's emails wait for its deposit (lib/booking/deposit.ts).
  if (result.ok && !result.checkoutUrl) {
    notifyBooking({
      kind: "created",
      ref: result.booking.ref,
      cancelToken: result.cancelToken,
    });
  }
  return result;
}

// Self-service via the link shown after booking (/book/{ref}#t={token}) or
// "Find my booking" (/book/find: ref + email).
export async function getMyBooking(
  input: ManageCredentials,
): Promise<ManageResult> {
  if (!(await lookupAllowed(input))) return TOO_MANY_LOOKUPS;
  return findManagedBooking(bookingRepository(), input, new Date());
}

export async function cancelMyBooking(
  input: ManageCredentials,
): Promise<ManageResult> {
  if (!(await lookupAllowed(input))) return TOO_MANY_LOOKUPS;
  const result = await cancelManagedBooking(bookingRepository(), input, new Date());
  if (result.ok) {
    notifyBooking({ kind: "client_cancelled", by: { ref: result.booking.ref } });
  }
  return result;
}

// Back from Stripe's payment page (/book/{ref}/thank-you?session_id=…). The
// webhook normally confirms first; this covers a slow webhook. Stripe is asked
// directly, so a made-up session id confirms nothing.
export async function confirmDepositReturn(sessionId: unknown): Promise<void> {
  if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId)) {
    return;
  }
  try {
    await fulfilCheckout(sessionId);
  } catch (error) {
    console.error("Deposit check on return failed", error);
  }
}

// The client pressed back on the payment page: free the time straight away.
// Needs the private token, so only the person who booked can release it.
export async function abandonDeposit(input: {
  ref: string;
  token: string;
}): Promise<{
  serviceId: string | null;
  outcome: "released" | "paid" | "unchanged";
}> {
  const booking = await findOwnBooking(bookingRepository(), {
    ref: String(input.ref),
    token: String(input.token),
  });
  if (!booking) return { serviceId: null, outcome: "unchanged" };
  let outcome: "released" | "paid" | "unchanged" = "unchanged";
  try {
    outcome = await abandonCheckout(booking);
  } catch (error) {
    console.error("Releasing a deposit hold failed", booking.id, error);
  }
  return { serviceId: booking.service.id, outcome };
}
