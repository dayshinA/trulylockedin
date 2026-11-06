import { z } from "zod";

import type { RateLimiter } from "@/lib/rate-limit";
import type {
  Booking,
  BookingRejection,
  BookingStatus,
  LocalDate,
  LocalTime,
  Slot,
} from "@/types/booking";
import { isOnlineService } from "./catalogue";
import { quoteForBooking } from "./quote";
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

// Inactive, not bookable online, or in a category hidden from the site: null.
async function getOnlineService(repo: BookingRepository, id: string) {
  const service = await repo.getService(id);
  if (!service) return null;
  const category = await repo.getCategory(service.categoryId);
  return category && isOnlineService(service, category) ? service : null;
}

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
    const service = await getOnlineService(repo, parsed.data.serviceId);
    if (!service) {
      return { ok: false, error: REJECTION_MESSAGES.service_unavailable };
    }
    const priced = quoteForBooking(service, parsed.data.optionIds);
    if (!priced.ok) {
      return { ok: false, error: REJECTION_MESSAGES[priced.reason] };
    }
    const slots = await loadAvailableSlots(repo, {
      date: parsed.data.date,
      service: { active: true, durationMin: priced.quote.durationMin },
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
        optionNames: string[];
        pricePence: number;
        date: LocalDate;
        start: LocalTime;
        end: LocalTime;
        status: BookingStatus;
        referencePhotoCount: number;
      };
      // Only ever returned here; the store keeps its hash.
      cancelToken: string;
      // Set when a deposit is due: send the client to Stripe's payment page.
      // The booking is held (awaiting_deposit) until it's paid.
      checkoutUrl?: string;
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
  context: {
    now: Date;
    clientKey: string;
    limiter: RateLimiter;
    // From the member session, never from `raw`.
    memberId?: string;
    // The terms' "Last updated" date, recorded as the version agreed to.
    termsVersion: string;
    // Makes the Stripe payment page for a booking held for its deposit.
    startCheckout: (booking: Booking) => Promise<{ id: string; url: string }>;
  },
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
    const service = await getOnlineService(repo, request.serviceId);
    if (!service) {
      return { ok: false, error: REJECTION_MESSAGES.service_unavailable };
    }

    const cancelToken = createCancelToken();
    const result = await repo.createBooking({
      service,
      optionIds: request.optionIds,
      date: request.date,
      start: request.start,
      client: {
        name: request.name,
        phone: request.phone,
        email: request.email,
        notes: request.notes,
      },
      referencePhotos: request.referencePhotos,
      ref: createBookingRef(),
      cancelTokenHash: hashToken(cancelToken),
      now: context.now,
      memberId: context.memberId,
      termsVersion: context.termsVersion,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: REJECTION_MESSAGES[result.reason],
        reason: result.reason,
      };
    }

    const { booking } = result;
    let checkoutUrl: string | undefined;
    if (booking.status === "awaiting_deposit") {
      try {
        const checkout = await context.startCheckout(booking);
        await repo.attachCheckoutSession(booking.id, checkout.id);
        checkoutUrl = checkout.url;
      } catch (error) {
        console.error("Deposit payment page failed", booking.id, error);
        await repo
          .releaseHold(booking.id)
          .catch((e) => console.error("Hold not released", booking.id, e));
        return {
          ok: false,
          error:
            "We couldn't open the payment page. Please try again in a moment.",
        };
      }
    }
    return {
      ok: true,
      checkoutUrl,
      booking: {
        ref: booking.ref,
        serviceName: booking.service.name,
        optionNames: (booking.service.options ?? []).map((o) => o.name),
        pricePence: booking.service.priceFromPence,
        date: booking.date,
        start: booking.start,
        end: booking.end,
        status: booking.status,
        referencePhotoCount: booking.referencePhotos?.length ?? 0,
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
