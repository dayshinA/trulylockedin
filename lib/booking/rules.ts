import type {
  BookingMode,
  BookingSettings,
  BookingStatus,
  DateOverride,
  LocalDate,
  TimeWindow,
  WeeklyHours,
} from "@/types/booking";
import type { Interval } from "./overlap";
import {
  addDays,
  localToUtcMs,
  MINUTE_MS,
  todayLocal,
  weekdayOf,
} from "./time";

// Today through today + maxAdvanceDays, salon-local. Same-day requests still face minNotice.
export function isWithinBookingWindow(
  date: LocalDate,
  settings: BookingSettings,
  now: Date,
): boolean {
  const today = todayLocal(now, settings.timezone);
  // yyyy-mm-dd compares correctly as a string.
  return date >= today && date <= addDays(today, settings.maxAdvanceDays);
}

export function meetsMinNotice(
  startMs: number,
  settings: BookingSettings,
  now: Date,
): boolean {
  return startMs >= now.getTime() + settings.minNoticeHours * 60 * MINUTE_MS;
}

// Override closed → none; override windows → those; else the weekday's hours.
export function openingWindows(
  date: LocalDate,
  weekly: WeeklyHours,
  override: DateOverride | null,
): TimeWindow[] {
  if (override?.closed) return [];
  if (override?.windows) return override.windows;
  return weekly[weekdayOf(date)] ?? [];
}

export function blockedIntervals(
  date: LocalDate,
  override: DateOverride | null,
  settings: BookingSettings,
): Interval[] {
  return (override?.blockedSlots ?? []).flatMap((time) => {
    const startMs = localToUtcMs(date, time, settings.timezone);
    if (startMs === null) return [];
    return [{ startMs, endMs: startMs + settings.slotIntervalMin * MINUTE_MS }];
  });
}

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "completed", "no_show"],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// Clients may cancel online until minNoticeHours before the start (the same
// window that stops new bookings); after that they need to contact the salon.
export function canClientCancel(
  booking: { status: BookingStatus; startUtc: string },
  settings: BookingSettings,
  now: Date,
): boolean {
  return (
    (booking.status === "pending" || booking.status === "confirmed") &&
    meetsMinNotice(Date.parse(booking.startUtc), settings, now)
  );
}

export function initialStatus(
  settings: BookingSettings,
  mode: BookingMode = "client",
): BookingStatus {
  return mode === "owner" || settings.autoConfirm ? "confirmed" : "pending";
}
