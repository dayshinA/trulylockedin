import type {
  BookingSettings,
  BookingStatus,
  DateOverride,
  LocalDate,
  TimeWindow,
  WeeklySchedule,
} from "@/types/booking";
import type { Interval } from "./overlap";
import {
  addDays,
  localToUtcMs,
  MINUTE_MS,
  parseLocalTime,
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
  weekly: WeeklySchedule,
  override: DateOverride | null,
): TimeWindow[] {
  if (override?.closed) return [];
  if (override?.windows) return override.windows;
  return weekly.hours[weekdayOf(date)] ?? [];
}

// A start at or after premiumFrom on its schedule date, or any start after
// midnight (the late night carries on), is a premium time.
export function isPremiumTime(
  slot: { date: LocalDate; start: string },
  scheduleDate: LocalDate,
  settings: Pick<BookingSettings, "premiumFrom">,
): boolean {
  if (settings.premiumFrom === null) return false;
  return slot.date > scheduleDate || slot.start >= settings.premiumFrom;
}

export type DayRulesResolved = { stepMin: number; chairs: number };

// Special date → weekday → the defaults in settings, field by field.
export function dayRulesFor(
  date: LocalDate,
  weekly: WeeklySchedule,
  override: DateOverride | null,
  settings: BookingSettings,
): DayRulesResolved {
  const day = weekly.rules[weekdayOf(date)];
  return {
    stepMin: override?.stepMin ?? day?.stepMin ?? settings.slotIntervalMin,
    chairs: override?.chairs ?? day?.chairs ?? settings.chairs,
  };
}

// A window as UTC instants. A closing time earlier than the opening (or
// "00:00") is on the next morning.
export function windowBounds(
  date: LocalDate,
  window: TimeWindow,
  timeZone: string,
): Interval | null {
  const overnight = parseLocalTime(window.end)! <= parseLocalTime(window.start)!;
  const startMs = localToUtcMs(date, window.start, timeZone);
  const endMs = localToUtcMs(
    overnight ? addDays(date, 1) : date,
    window.end,
    timeZone,
  );
  return startMs === null || endMs === null ? null : { startMs, endMs };
}

// A time typed for a schedule date: on a day that closes after midnight,
// times up to that closing time are the next morning ("01:00" on a
// 13:00–03:00 Wednesday is Thursday 01:00).
export function scheduleTimeToMs(
  date: LocalDate,
  time: string,
  windows: readonly TimeWindow[],
  timeZone: string,
): number | null {
  const last = windows.at(-1);
  const minutes = parseLocalTime(time);
  if (minutes === null) return null;
  const nextMorning =
    last !== undefined &&
    parseLocalTime(last.end)! <= parseLocalTime(last.start)! &&
    minutes < parseLocalTime(last.end)!;
  return localToUtcMs(nextMorning ? addDays(date, 1) : date, time, timeZone);
}

// Each blocked time blocks one start-time gap from that time.
export function blockedIntervals(
  date: LocalDate,
  windows: readonly TimeWindow[],
  override: DateOverride | null,
  settings: BookingSettings,
  stepMin: number,
): Interval[] {
  return (override?.blockedSlots ?? []).flatMap((time) => {
    const startMs = scheduleTimeToMs(date, time, windows, settings.timezone);
    if (startMs === null) return [];
    return [{ startMs, endMs: startMs + stepMin * MINUTE_MS }];
  });
}

// awaiting_deposit only changes through the Stripe payment
// (FirestoreBookingRepository.confirmDeposit / releaseHold), never by hand.
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  awaiting_deposit: [],
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
    booking.status === "confirmed" &&
    meetsMinNotice(Date.parse(booking.startUtc), settings, now)
  );
}
