import type {
  BookedTime,
  BookingRejection,
  BookingSettings,
  DateOverride,
  LocalDate,
  Slot,
  WeeklySchedule,
} from "@/types/booking";
import { fitsAlongside, overlaps, type Interval } from "./overlap";
import {
  blockedIntervals,
  dayRulesFor,
  isPremiumTime,
  isWithinBookingWindow,
  meetsMinNotice,
  openingWindows,
  scheduleTimeToMs,
  windowBounds,
} from "./rules";
import { MINUTE_MS, parseLocalDate, utcMsToLocal } from "./time";

export type AvailabilityInput = {
  // The schedule date. Starts after midnight on a day that closes late belong
  // to it, though their real date is the next one (Slot.date).
  date: LocalDate;
  // durationMin is the whole appointment, options included (see quote.ts).
  service: { active: boolean; durationMin: number };
  weekly: WeeklySchedule;
  override: DateOverride | null;
  // Bookings on this date and the dates either side (appointments can run past
  // midnight); cancelled ones are ignored.
  bookings: readonly BookedTime[];
  settings: BookingSettings;
  now: Date;
};

type DayPlan =
  | { ok: true; startsMs: number[]; blocked: Interval[]; chairs: number }
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

  const { stepMin, chairs } = dayRulesFor(date, weekly, override, settings);
  const durationMs = service.durationMin * MINUTE_MS;
  const stepMs = stepMin * MINUTE_MS;
  const starts = new Set<number>();

  for (const window of windows) {
    const bounds = windowBounds(date, window, settings.timezone);
    if (!bounds) continue;
    // Starts every stepMin from opening; the appointment must finish by closing.
    for (let t = bounds.startMs; t + durationMs <= bounds.endMs; t += stepMs) {
      starts.add(t);
    }
  }
  for (const time of extras) {
    const t = scheduleTimeToMs(date, time, windows, settings.timezone);
    if (t !== null) starts.add(t);
  }

  return {
    ok: true,
    startsMs: [...starts].sort((a, b) => a - b),
    blocked: blockedIntervals(date, windows, override, settings, stepMin),
    chairs,
  };
}

export function checkStart(
  startMs: number,
  input: AvailabilityInput,
  plan: { blocked: readonly Interval[]; chairs: number },
): BookingRejection | null {
  const interval = {
    startMs,
    endMs: startMs + input.service.durationMin * MINUTE_MS,
  };
  if (!meetsMinNotice(startMs, input.settings, input.now)) return "too_soon";
  if (plan.blocked.some((cell) => overlaps(interval, cell))) return "blocked";
  const { bufferMin, staggerMin } = input.settings;
  if (
    !fitsAlongside(interval, input.bookings, {
      chairs: plan.chairs,
      bufferMin,
      staggerMin,
    })
  ) {
    return "slot_taken";
  }
  return null;
}

// `scheduleDate` is the day whose times these are (see Slot.date).
export function toSlot(
  startMs: number,
  durationMin: number,
  scheduleDate: LocalDate,
  settings: BookingSettings,
): Slot {
  const endMs = startMs + durationMin * MINUTE_MS;
  const start = utcMsToLocal(startMs, settings.timezone);
  const slot: Slot = {
    date: start.date,
    start: start.time,
    end: utcMsToLocal(endMs, settings.timezone).time,
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
  };
  if (isPremiumTime(slot, scheduleDate, settings)) slot.premium = true;
  return slot;
}

export function getAvailableSlots(input: AvailabilityInput): Slot[] {
  const plan = planDay(input);
  if (!plan.ok) return [];
  return plan.startsMs
    .filter((startMs) => checkStart(startMs, input, plan) === null)
    .map((startMs) =>
      toSlot(startMs, input.service.durationMin, input.date, input.settings),
    );
}
