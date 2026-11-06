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

// A deposit hold stops blocking its time once it lapses, even if its
// booking is never cleaned up.
export function blocksTime(entry: BookedTime, nowMs: number): boolean {
  if (!occupiesTime(entry.status)) return false;
  return !(
    entry.status === "awaiting_deposit" &&
    entry.holdExpiresAt !== undefined &&
    Date.parse(entry.holdExpiresAt) <= nowMs
  );
}

export type ChairRules = {
  chairs: number;
  // Free time after each appointment before its chair takes the next client.
  bufferMin: number;
  // Two clients never start closer together than this.
  staggerMin: number;
};

// Whether a new appointment fits next to the existing ones: at no moment more
// than `chairs` appointments (each followed by its buffer), and no two starts
// closer than staggerMin. With 1 chair this is "no overlap". Padding every
// appointment with the buffer keeps it exact: if at most N padded intervals
// ever overlap, they can always be shared out over N chairs.
export function fitsAlongside(
  candidate: Interval,
  bookings: readonly BookedTime[],
  rules: ChairRules,
): boolean {
  const buffer = rules.bufferMin * MINUTE_MS;
  const stagger = rules.staggerMin * MINUTE_MS;
  const padded = { startMs: candidate.startMs, endMs: candidate.endMs + buffer };
  const others = bookings
    .filter((booking) => occupiesTime(booking.status))
    .map((booking) => ({
      startMs: Date.parse(booking.startUtc),
      endMs: Date.parse(booking.endUtc) + buffer,
    }));

  if (others.some((o) => Math.abs(o.startMs - candidate.startMs) < stagger)) {
    return false;
  }
  const overlapping = others.filter((o) => overlaps(padded, o));
  // The count only rises where an appointment starts, so checking the
  // candidate's start and every later start inside it finds the busiest moment.
  const moments = [
    padded.startMs,
    ...overlapping.map((o) => o.startMs).filter((t) => t > padded.startMs),
  ];
  const busiest = Math.max(
    ...moments.map(
      (t) => overlapping.filter((o) => o.startMs <= t && t < o.endMs).length,
    ),
  );
  return busiest < rules.chairs;
}
