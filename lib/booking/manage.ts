import { z } from "zod";

import type {
  BookingStatus,
  DepositStatus,
  LocalDate,
  LocalTime,
} from "@/types/booking";
import type { BookingRepository } from "./repository";
import { canClientCancel } from "./rules";
import {
  BOOKING_REF_RE,
  normalizeRef,
  sameEmail,
  tokenMatches,
} from "./tokens";

// Client self-service, two ways in:
// - the private link shown after booking, /book/{ref}#t={cancelToken};
// - "Find my booking" (/book/find): the ref plus the email used to book.
// The ref alone grants nothing.

export type BookingSummary = {
  ref: string;
  serviceName: string;
  optionNames: string[];
  date: LocalDate;
  start: LocalTime;
  end: LocalTime;
  status: BookingStatus;
  clientName: string;
  pricePence: number;
  // Booked at a premium time at the premium price.
  premium: boolean;
  notes?: string;
  deposit?: { amountPence: number; status: DepositStatus };
  canCancel: boolean;
};

export type ManageResult =
  | { ok: true; booking: BookingSummary }
  | { ok: false; error: string };

const refSchema = z
  .string()
  .max(40)
  .transform((ref) => normalizeRef(ref, "TLI"))
  .pipe(
  z.string().regex(BOOKING_REF_RE),
);

const manageSchema = z.union([
  z.object({ ref: refSchema, token: z.string().min(20).max(100) }),
  z.object({ ref: refSchema, email: z.string().trim().min(3).max(200) }),
]);

export type ManageCredentials =
  | { ref: string; token: string }
  | { ref: string; email: string };

// Same message for an unknown ref and a wrong token or email, so refs can't
// be probed.
const NOT_FOUND_LINK = "We couldn't find that booking. Please check your link.";
const NOT_FOUND_EMAIL =
  "We couldn't find a booking with those details. Check the reference and use the email you booked with.";

async function authorise(repo: BookingRepository, raw: unknown) {
  const parsed = manageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const credentials = parsed.data;
  const booking = await repo.getBookingByRef(credentials.ref);
  if (!booking) return null;
  const allowed =
    "token" in credentials
      ? tokenMatches(credentials.token, booking.cancelTokenHash)
      : // Older bookings without an email can only use their link.
        booking.client.email !== undefined &&
        sameEmail(credentials.email, booking.client.email);
  return allowed ? booking : null;
}

// The full booking, for server code acting on the client's behalf.
export function findOwnBooking(
  repo: BookingRepository,
  credentials: ManageCredentials,
) {
  return authorise(repo, credentials);
}

function notFound(raw: unknown): string {
  return typeof raw === "object" && raw !== null && "email" in raw
    ? NOT_FOUND_EMAIL
    : NOT_FOUND_LINK;
}

export async function findManagedBooking(
  repo: BookingRepository,
  raw: unknown,
  now: Date,
): Promise<ManageResult> {
  const booking = await authorise(repo, raw);
  if (!booking) return { ok: false, error: notFound(raw) };
  const settings = await repo.getSettings();
  return {
    ok: true,
    booking: {
      ref: booking.ref,
      serviceName: booking.service.name,
      optionNames: (booking.service.options ?? []).map((o) => o.name),
      date: booking.date,
      start: booking.start,
      end: booking.end,
      status: booking.status,
      clientName: booking.client.name,
      pricePence: booking.service.priceFromPence,
      premium: booking.service.premium === true,
      notes: booking.client.notes,
      deposit: booking.deposit && {
        amountPence: booking.deposit.amountPence,
        status: booking.deposit.status,
      },
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
  if (!booking) return { ok: false, error: notFound(raw) };

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
