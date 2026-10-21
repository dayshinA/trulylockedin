import type {
  BookingMode,
  BookingRejection,
  LocalTime,
  Slot,
} from "@/types/booking";
import {
  checkStart,
  planDay,
  toSlot,
  type AvailabilityInput,
} from "./availability";
import { clashesWithBookings } from "./overlap";
import { addDays, localToUtcMs, MINUTE_MS, parseLocalDate } from "./time";

export type ValidationResult =
  | { ok: true; slot: Slot }
  | { ok: false; reason: BookingRejection };

// Re-runs every availability rule for one requested start time. Call it on the
// server with freshly read data, inside the same transaction as the write.
export function validateBookingRequest(
  input: AvailabilityInput & { start: LocalTime; mode?: BookingMode },
): ValidationResult {
  if (input.mode === "owner") return validateOwnerBooking(input);

  const plan = planDay(input);
  if (!plan.ok) return plan;

  const startMs = localToUtcMs(
    input.date,
    input.start,
    input.settings.timezone,
  );
  if (startMs === null) return { ok: false, reason: "invalid_time" };
  if (!plan.startsMs.includes(startMs))
    return { ok: false, reason: "not_a_slot" };

  const reason = checkStart(startMs, input, plan.blocked);
  if (reason) return { ok: false, reason };

  return {
    ok: true,
    slot: toSlot(startMs, input.service.durationMin, input.settings.timezone),
  };
}

// The owner can book any time on any date (phone bookings, walk-ins, after
// hours), but never on top of another appointment. No buffer: they chose the gap.
// It must end by midnight because availability is stored per local date.
function validateOwnerBooking(
  input: AvailabilityInput & { start: LocalTime },
): ValidationResult {
  const { date, start, service, settings } = input;
  if (!parseLocalDate(date)) return { ok: false, reason: "invalid_date" };
  if (service.durationMin <= 0) {
    return { ok: false, reason: "service_unavailable" };
  }
  const startMs = localToUtcMs(date, start, settings.timezone);
  if (startMs === null || start === "24:00") {
    return { ok: false, reason: "invalid_time" };
  }
  const endMs = startMs + service.durationMin * MINUTE_MS;
  const dayEnd = localToUtcMs(addDays(date, 1), "00:00", settings.timezone)!;
  if (endMs > dayEnd) return { ok: false, reason: "outside_day" };
  if (clashesWithBookings({ startMs, endMs }, input.bookings, 0)) {
    return { ok: false, reason: "slot_taken" };
  }
  return {
    ok: true,
    slot: toSlot(startMs, service.durationMin, settings.timezone),
  };
}

export const REJECTION_MESSAGES: Record<BookingRejection, string> = {
  invalid_date: "That date isn't valid.",
  invalid_time: "That time isn't valid.",
  service_unavailable: "That service isn't available to book right now.",
  outside_booking_window: "Bookings aren't open for that date.",
  closed: "We're closed on that day.",
  not_a_slot: "That time isn't one of the available slots.",
  too_soon: "That time is too soon to book online.",
  blocked: "That time isn't available.",
  slot_taken: "Sorry, that slot has just been taken. Please pick another time.",
  outside_day: "The appointment must finish by midnight.",
};

// Wording for the owner's manual-booking form.
export const OWNER_REJECTION_MESSAGES: Partial<
  Record<BookingRejection, string>
> = {
  slot_taken: "That time overlaps another appointment.",
  outside_day: "The appointment must finish by midnight.",
};
