import { z } from "zod";

import type { RateLimiter } from "@/lib/rate-limit";
import type {
  BookingRejection,
  BookingStatus,
  LocalDate,
  LocalTime,
  Slot,
} from "@/types/booking";
import {
  BookingNotConfiguredError,
  loadAvailableSlots,
  type BookingRepository,
} from "./repository";
import { bookingRequestSchema, slotQuerySchema } from "./request";
import { createBookingRef, createCancelToken, hashToken } from "./tokens";
import { REJECTION_MESSAGES } from "./validate";

// Framework-free core of the public booking Server Actions. The actions only
// add request data (time, IP).

const NOT_OPEN = "Online booking isn't open yet. Please get in touch to book.";
const GENERIC = "Something went wrong. Please try again.";

export type FindSlotsResult =
  | { ok: true; slots: Slot[] }
  | { ok: false; error: string };

export async function findSlots(
  repo: BookingRepository,
  raw: unknown,
  now: Date,
): Promise<FindSlotsResult> {
  const parsed = slotQuerySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: GENERIC };

  try {
    const service = await repo.getService(parsed.data.serviceId);
    if (!service?.active) {
      return { ok: false, error: REJECTION_MESSAGES.service_unavailable };
    }
    const slots = await loadAvailableSlots(repo, {
      date: parsed.data.date,
      service,
      now,
    });
    return { ok: true, slots };
  } catch (error) {
    return { ok: false, error: failureMessage(error) };
  }
}

export type SubmitBookingResult =
  | {
      ok: true;
      booking: {
        ref: string;
        serviceName: string;
        date: LocalDate;
        start: LocalTime;
        end: LocalTime;
        status: BookingStatus;
      };
      // Only ever returned here; the store keeps its hash.
      cancelToken: string;
    }
  | {
      ok: false;
      error: string;
      // Set when the booking engine rejected the request (e.g. "slot_taken").
      reason?: BookingRejection;
      fieldErrors?: Partial<Record<string, string[]>>;
    };

export async function submitBooking(
  repo: BookingRepository,
  raw: unknown,
  context: { now: Date; clientKey: string; limiter: RateLimiter },
): Promise<SubmitBookingResult> {
  // Honeypot first: bots get a dull, uninformative failure.
  if (
    typeof raw === "object" &&
    raw !== null &&
    "website" in raw &&
    typeof raw.website === "string" &&
    raw.website.trim() !== ""
  ) {
    return { ok: false, error: GENERIC };
  }

  if (!context.limiter.hit(context.clientKey, context.now.getTime())) {
    return {
      ok: false,
      error: "Too many booking attempts. Please try again in a few minutes.",
    };
  }

  const parsed = bookingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const request = parsed.data;

  try {
    const service = await repo.getService(request.serviceId);
    if (!service?.active) {
      return { ok: false, error: REJECTION_MESSAGES.service_unavailable };
    }

    const cancelToken = createCancelToken();
    const result = await repo.createBooking({
      service,
      date: request.date,
      start: request.start,
      client: {
        name: request.name,
        phone: request.phone,
        email: request.email,
        notes: request.notes,
      },
      ref: createBookingRef(),
      cancelTokenHash: hashToken(cancelToken),
      now: context.now,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: REJECTION_MESSAGES[result.reason],
        reason: result.reason,
      };
    }

    const { booking } = result;
    return {
      ok: true,
      booking: {
        ref: booking.ref,
        serviceName: booking.service.name,
        date: booking.date,
        start: booking.start,
        end: booking.end,
        status: booking.status,
      },
      cancelToken,
    };
  } catch (error) {
    return { ok: false, error: failureMessage(error) };
  }
}

function failureMessage(error: unknown): string {
  if (error instanceof BookingNotConfiguredError) {
    return NOT_OPEN;
  }
  console.error("Booking request failed", error);
  return GENERIC;
}
