import { z } from "zod";

import type { BookingStatus, LocalDate, LocalTime } from "@/types/booking";
import type { BookingRepository } from "./repository";
import { canClientCancel } from "./rules";
import { BOOKING_REF_RE, tokenMatches } from "./tokens";

// Client self-service through the link shown after booking:
// /book/{ref}#t={cancelToken}. The ref alone grants nothing; the token does.

export type BookingSummary = {
  ref: string;
  serviceName: string;
  date: LocalDate;
  start: LocalTime;
  end: LocalTime;
  status: BookingStatus;
  clientName: string;
  canCancel: boolean;
};

export type ManageResult =
  | { ok: true; booking: BookingSummary }
  | { ok: false; error: string };

const manageSchema = z.object({
  ref: z.string().regex(BOOKING_REF_RE),
  token: z.string().min(20).max(100),
});

// Same message for an unknown ref and a wrong token, so refs can't be probed.
const NOT_FOUND = "We couldn't find that booking. Please check your link.";

async function authorise(repo: BookingRepository, raw: unknown) {
  const parsed = manageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const booking = await repo.getBookingByRef(parsed.data.ref);
  if (!booking || !tokenMatches(parsed.data.token, booking.cancelTokenHash)) {
    return null;
  }
  return booking;
}

export async function findManagedBooking(
  repo: BookingRepository,
  raw: unknown,
  now: Date,
): Promise<ManageResult> {
  const booking = await authorise(repo, raw);
  if (!booking) return { ok: false, error: NOT_FOUND };
  const settings = await repo.getSettings();
  return {
    ok: true,
    booking: {
      ref: booking.ref,
      serviceName: booking.service.name,
      date: booking.date,
      start: booking.start,
      end: booking.end,
      status: booking.status,
      clientName: booking.client.name,
      canCancel: canClientCancel(booking, settings, now),
    },
  };
}

export async function cancelManagedBooking(
  repo: BookingRepository,
  raw: unknown,
  now: Date,
): Promise<ManageResult> {
  const booking = await authorise(repo, raw);
  if (!booking) return { ok: false, error: NOT_FOUND };

  const settings = await repo.getSettings();
  if (!canClientCancel(booking, settings, now)) {
    return {
      ok: false,
      error:
        "This booking can no longer be cancelled online. Please contact us.",
    };
  }

  const result = await repo.cancelBooking(booking.id, now);
  if (!result.ok) {
    return { ok: false, error: "This booking can't be cancelled." };
  }
  return findManagedBooking(repo, raw, now);
}
