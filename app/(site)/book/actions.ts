"use server";

import {
  cancelManagedBooking,
  findManagedBooking,
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
import { createRateLimiter } from "@/lib/rate-limit";

// Per-process; see lib/rate-limit.ts.
const bookingLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

// Live availability: request-time, never cached.
export async function getSlots(input: {
  serviceId: string;
  optionIds: string[];
  date: string;
}): Promise<FindSlotsResult> {
  return findSlots(bookingRepository(), input, new Date());
}

export async function createBooking(
  input: Record<string, unknown>,
): Promise<SubmitBookingResult> {
  return submitBooking(bookingRepository(), input, {
    now: new Date(),
    clientKey: await clientKey(),
    limiter: bookingLimiter,
  });
}

// Self-service via the link shown after booking (/book/{ref}#t={token}).
export async function getMyBooking(input: {
  ref: string;
  token: string;
}): Promise<ManageResult> {
  return findManagedBooking(bookingRepository(), input, new Date());
}

export async function cancelMyBooking(input: {
  ref: string;
  token: string;
}): Promise<ManageResult> {
  return cancelManagedBooking(bookingRepository(), input, new Date());
}
