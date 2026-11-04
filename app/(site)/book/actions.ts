"use server";

import { getMember } from "@/lib/auth/member-dal";
import {
  cancelManagedBooking,
  findManagedBooking,
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
import { rememberMemberPhone } from "@/lib/members/remember-phone";
import { createRateLimiter } from "@/lib/rate-limit";

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

// Guests and members use the same form. A signed-in member's bookings are
// linked to their account, and the phone they used is remembered.
export async function createBooking(
  input: Record<string, unknown>,
): Promise<SubmitBookingResult> {
  const member = await getMember();
  const result = await submitBooking(bookingRepository(), input, {
    now: new Date(),
    clientKey: await clientKey(),
    limiter: bookingLimiter,
    memberId: member?.uid,
  });

  if (result.ok && member) await rememberMemberPhone(member, input.phone);
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
  return cancelManagedBooking(bookingRepository(), input, new Date());
}
