import type {
  Booking,
  BookingStatus,
  LocalDate,
  LocalTime,
} from "@/types/booking";
import { buildCatalogue, isBookableOnline } from "./catalogue";
import type { BookingRepository } from "./repository";
import { canClientCancel } from "./rules";

// A signed-in member's own bookings on /account. Ownership comes from
// Booking.memberId, which only the server sets from the session.

export type MemberBooking = {
  id: string;
  ref: string;
  serviceName: string;
  optionNames: string[];
  pricePence: number;
  date: LocalDate;
  start: LocalTime;
  end: LocalTime;
  status: BookingStatus;
  canCancel: boolean;
  // Null when the service can't be booked online any more.
  bookAgainHref: string | null;
};

export type MemberBookings = {
  // Pending or confirmed and not yet started, soonest first.
  upcoming: MemberBooking[];
  // Everything else, most recent first.
  past: MemberBooking[];
};

const PAST_LIMIT = 20;

export async function loadMemberBookings(
  repo: BookingRepository,
  memberId: string,
  now: Date,
): Promise<MemberBookings> {
  const [bookings, settings, categories, services] = await Promise.all([
    repo.listBookingsByMember(memberId),
    repo.getSettings(),
    repo.listCategories(),
    repo.listServices({ activeOnly: true }),
  ]);

  const bookable = new Map(
    buildCatalogue(categories, services).flatMap((category) =>
      category.services
        .filter((s) => isBookableOnline(s, category))
        .map((s) => [s.id, s] as const),
    ),
  );

  const view = (booking: Booking): MemberBooking => {
    const service = bookable.get(booking.service.id);
    // Options that no longer exist are dropped; /book re-checks the rest.
    const optionIds = (booking.service.options ?? [])
      .map((o) => o.id)
      .filter((id) => service?.options.some((o) => o.id === id));
    return {
      id: booking.id,
      ref: booking.ref,
      serviceName: booking.service.name,
      optionNames: (booking.service.options ?? []).map((o) => o.name),
      pricePence: booking.service.priceFromPence,
      date: booking.date,
      start: booking.start,
      end: booking.end,
      status: booking.status,
      canCancel: canClientCancel(booking, settings, now),
      bookAgainHref: service ? bookAgainHref(service.id, optionIds) : null,
    };
  };

  const isUpcoming = (b: Booking) =>
    (b.status === "pending" || b.status === "confirmed") &&
    Date.parse(b.startUtc) > now.getTime();

  return {
    upcoming: bookings
      .filter(isUpcoming)
      .toSorted((a, b) => a.startUtc.localeCompare(b.startUtc))
      .map(view),
    past: bookings
      .filter((b) => !isUpcoming(b))
      .toSorted((a, b) => b.startUtc.localeCompare(a.startUtc))
      .slice(0, PAST_LIMIT)
      .map(view),
  };
}

// Same link format the /book page reads: ?service=…&options=a,b
export function bookAgainHref(serviceId: string, optionIds: string[]): string {
  const params = new URLSearchParams({ service: serviceId });
  if (optionIds.length > 0) params.set("options", optionIds.join(","));
  return `/book?${params}`;
}

export type CancelMemberBookingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelMemberBooking(
  repo: BookingRepository,
  memberId: string,
  bookingId: string,
  now: Date,
): Promise<CancelMemberBookingResult> {
  const booking = await repo.getBooking(bookingId);
  // Someone else's booking looks the same as a missing one.
  if (!booking || booking.memberId !== memberId) {
    return { ok: false, error: "We couldn't find that booking." };
  }

  const settings = await repo.getSettings();
  if (!canClientCancel(booking, settings, now)) {
    return {
      ok: false,
      error:
        "This booking can no longer be cancelled online. Please contact us.",
    };
  }

  const result = await repo.cancelBooking(booking.id, now);
  return result.ok
    ? { ok: true }
    : { ok: false, error: "This booking can't be cancelled." };
}
