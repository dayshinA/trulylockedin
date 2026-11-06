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
import { fitsAlongside } from "./overlap";
import { dayRulesFor } from "./rules";
import {
  localToUtcMs,
  MINUTE_MS,
  parseLocalDate,
  parseLocalTime,
  utcMsToLocal,
} from "./time";

export type ValidationResult =
  | { ok: true; slot: Slot }
  | { ok: false; reason: BookingRejection };

// Re-runs every availability rule for one requested start time. Call it on the
// server with freshly read data, inside the same transaction as the write.
// `date` is the schedule date and `start` one of its offered times, which may
// be after midnight (the returned slot carries the real date).
export function validateBookingRequest(
  input: AvailabilityInput & { start: LocalTime; mode?: BookingMode },
): ValidationResult {
  if (input.mode === "owner") return validateOwnerBooking(input);

  const plan = planDay(input);
  if (!plan.ok) return plan;

  const minutes = parseLocalTime(input.start);
  if (minutes === null || minutes >= 24 * 60) {
    return { ok: false, reason: "invalid_time" };
  }
  const { timezone } = input.settings;
  const startMs = plan.startsMs.find(
    (ms) => utcMsToLocal(ms, timezone).time === input.start,
  );
  if (startMs === undefined) return { ok: false, reason: "not_a_slot" };

  const reason = checkStart(startMs, input, plan);
  if (reason) return { ok: false, reason };

  return {
    ok: true,
    slot: toSlot(startMs, input.service.durationMin, input.date, input.settings),
  };
}

// The owner can book any time on any date (phone bookings, walk-ins, after
// hours), as long as a chair is free. No buffer or stagger: they chose the gap.
// `date` + `start` are the real local date and time here.
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
  const { chairs } = dayRulesFor(date, input.weekly, input.override, settings);
  if (
    !fitsAlongside({ startMs, endMs }, input.bookings, {
      chairs,
      bufferMin: 0,
      staggerMin: 0,
    })
  ) {
    return { ok: false, reason: "slot_taken" };
  }
  return {
    ok: true,
    // Owner times are real dates; whether to charge premium is their choice.
    slot: toSlot(startMs, service.durationMin, date, settings),
  };
}

export const REJECTION_MESSAGES: Record<BookingRejection, string> = {
  invalid_date: "That date isn't valid.",
  invalid_time: "That time isn't valid.",
  service_unavailable: "That service isn't available to book right now.",
  options_required: "Please choose an option for this service.",
  invalid_options: "Those options aren't available for this service.",
  outside_booking_window: "Bookings aren't open for that date.",
  closed: "We're closed on that day.",
  not_a_slot: "That time isn't one of the available slots.",
  too_soon: "That time is too soon to book online.",
  blocked: "That time isn't available.",
  slot_taken: "Sorry, that slot has just been taken. Please pick another time.",
};

// Wording for the owner's manual-booking form.
export const OWNER_REJECTION_MESSAGES: Partial<
  Record<BookingRejection, string>
> = {
  service_unavailable: "Add a duration to this service under Services first.",
  slot_taken: "Every chair is taken at that time.",
};
