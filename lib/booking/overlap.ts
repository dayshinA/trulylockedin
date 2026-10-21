import type { BookedTime, BookingStatus } from "@/types/booking";
import { MINUTE_MS } from "./time";

// Half-open [startMs, endMs).
export type Interval = { startMs: number; endMs: number };

export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

// Cancelled bookings free their time; every other status keeps it.
export function occupiesTime(status: BookingStatus): boolean {
  return status !== "cancelled";
}

// Both sides carry the trailing buffer, which is exactly "each appointment is
// followed by bufferMin before the next one may start", in either order.
export function clashesWithBookings(
  candidate: Interval,
  bookings: readonly BookedTime[],
  bufferMin: number,
): boolean {
  const buffer = bufferMin * MINUTE_MS;
  const padded = {
    startMs: candidate.startMs,
    endMs: candidate.endMs + buffer,
  };
  return bookings.some(
    (booking) =>
      occupiesTime(booking.status) &&
      overlaps(padded, {
        startMs: Date.parse(booking.startUtc),
        endMs: Date.parse(booking.endUtc) + buffer,
      }),
  );
}
