import type { Booking, LocalDate } from "@/types/booking";
import type { BookingRepository } from "./repository";
import { addDays, localToUtcMs, todayLocal } from "./time";

// Read models for the admin dashboard. Framework-free.

export const BOOKING_VIEWS = [
  "upcoming",
  "pending",
  "past",
  "cancelled",
] as const;
export type BookingView = (typeof BOOKING_VIEWS)[number];

const PAST_DAYS = 30;
const OVERVIEW_DAYS = 7;

function startOfDayIso(date: LocalDate, timeZone: string): string {
  return new Date(localToUtcMs(date, "00:00", timeZone)!).toISOString();
}

const isOpen = (b: Booking) =>
  b.status === "pending" || b.status === "confirmed";

export type Overview = {
  today: LocalDate;
  todays: Booking[];
  pending: Booking[];
  upcoming: Booking[];
};

export async function loadOverview(
  repo: BookingRepository,
  now: Date,
): Promise<Overview> {
  const { timezone } = await repo.getSettings();
  const today = todayLocal(now, timezone);
  const bookings = await repo.listBookings({
    fromUtc: startOfDayIso(today, timezone),
  });
  const weekEnd = addDays(today, OVERVIEW_DAYS);
  const nowIso = now.toISOString();

  return {
    today,
    todays: bookings.filter(
      (b) => b.date === today && b.status !== "cancelled",
    ),
    pending: bookings.filter(
      (b) => b.status === "pending" && b.endUtc > nowIso,
    ),
    upcoming: bookings.filter(
      (b) => b.date > today && b.date <= weekEnd && isOpen(b),
    ),
  };
}

export async function loadBookingList(
  repo: BookingRepository,
  view: BookingView,
  now: Date,
): Promise<{ today: LocalDate; bookings: Booking[] }> {
  const { timezone } = await repo.getSettings();
  const today = todayLocal(now, timezone);
  const todayStart = startOfDayIso(today, timezone);

  if (view === "past") {
    const bookings = await repo.listBookings({
      fromUtc: startOfDayIso(addDays(today, -PAST_DAYS), timezone),
      toUtc: todayStart,
    });
    // Most recent first.
    return { today, bookings: bookings.reverse() };
  }

  const bookings = await repo.listBookings({ fromUtc: todayStart });
  const filtered = bookings.filter((b) =>
    view === "pending"
      ? b.status === "pending"
      : view === "cancelled"
        ? b.status === "cancelled"
        : b.status !== "cancelled",
  );
  return { today, bookings: filtered };
}

export function groupByDate(bookings: Booking[]): [LocalDate, Booking[]][] {
  const groups = new Map<LocalDate, Booking[]>();
  for (const booking of bookings) {
    const group = groups.get(booking.date) ?? [];
    group.push(booking);
    groups.set(booking.date, group);
  }
  return [...groups];
}
