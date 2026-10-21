import type {
  BookedTime,
  BookingRejection,
  BookingSettings,
  DateOverride,
  LocalDate,
  Service,
  Slot,
  WeeklyHours,
} from "@/types/booking";
import { clashesWithBookings, overlaps, type Interval } from "./overlap";
import {
  blockedIntervals,
  isWithinBookingWindow,
  meetsMinNotice,
  openingWindows,
} from "./rules";
import { localToUtcMs, MINUTE_MS, parseLocalDate, utcMsToLocal } from "./time";

export type AvailabilityInput = {
  date: LocalDate;
  service: Pick<Service, "durationMin" | "active">;
  weekly: WeeklyHours;
  override: DateOverride | null;
  // Bookings on this date; cancelled ones are ignored.
  bookings: readonly BookedTime[];
  settings: BookingSettings;
  now: Date;
};

type DayPlan =
  | { ok: true; startsMs: number[]; blocked: Interval[] }
  | { ok: false; reason: BookingRejection };

// Day-level checks plus every candidate start time, before per-slot filtering.
// Shared by getAvailableSlots and validateBookingRequest so they can't drift apart.
export function planDay(input: AvailabilityInput): DayPlan {
  const { date, service, weekly, override, settings, now } = input;

  if (!parseLocalDate(date)) return { ok: false, reason: "invalid_date" };
  if (!service.active || service.durationMin <= 0) {
    return { ok: false, reason: "service_unavailable" };
  }
  if (!isWithinBookingWindow(date, settings, now)) {
    return { ok: false, reason: "outside_booking_window" };
  }

  const windows = openingWindows(date, weekly, override);
  const extras = override?.closed ? [] : (override?.extraSlots ?? []);
  if (windows.length === 0 && extras.length === 0) {
    return { ok: false, reason: "closed" };
  }

  const durationMs = service.durationMin * MINUTE_MS;
  const stepMs = settings.slotIntervalMin * MINUTE_MS;
  const starts = new Set<number>();

  for (const window of windows) {
    const windowStart = localToUtcMs(date, window.start, settings.timezone);
    const windowEnd = localToUtcMs(date, window.end, settings.timezone);
    if (windowStart === null || windowEnd === null) continue;
    // The appointment must finish by closing; the buffer only matters between clients.
    for (let t = windowStart; t + durationMs <= windowEnd; t += stepMs) {
      starts.add(t);
    }
  }
  for (const time of extras) {
    const t = localToUtcMs(date, time, settings.timezone);
    if (t !== null) starts.add(t);
  }

  return {
    ok: true,
    startsMs: [...starts].sort((a, b) => a - b),
    blocked: blockedIntervals(date, override, settings),
  };
}

export function checkStart(
  startMs: number,
  input: AvailabilityInput,
  blocked: readonly Interval[],
): BookingRejection | null {
  const interval = {
    startMs,
    endMs: startMs + input.service.durationMin * MINUTE_MS,
  };
  if (!meetsMinNotice(startMs, input.settings, input.now)) return "too_soon";
  if (blocked.some((cell) => overlaps(interval, cell))) return "blocked";
  if (clashesWithBookings(interval, input.bookings, input.settings.bufferMin)) {
    return "slot_taken";
  }
  return null;
}

export function toSlot(
  startMs: number,
  durationMin: number,
  timeZone: string,
): Slot {
  const endMs = startMs + durationMin * MINUTE_MS;
  return {
    start: utcMsToLocal(startMs, timeZone).time,
    end: utcMsToLocal(endMs, timeZone).time,
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
  };
}

export function getAvailableSlots(input: AvailabilityInput): Slot[] {
  const plan = planDay(input);
  if (!plan.ok) return [];
  return plan.startsMs
    .filter((startMs) => checkStart(startMs, input, plan.blocked) === null)
    .map((startMs) =>
      toSlot(startMs, input.service.durationMin, input.settings.timezone),
    );
}
