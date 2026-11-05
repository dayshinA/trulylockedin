import { TIMEZONE } from "@/lib/site";
import type { BookingSettings, WeeklyHours } from "@/types/booking";

// Starting values for settings/main; the owner changes them in the CMS.
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  timezone: TIMEZONE,
  slotIntervalMin: 30,
  bufferMin: 15,
  minNoticeHours: 24,
  maxAdvanceDays: 56,
  depositPence: 3000,
};

// Placeholder opening hours until the owner sets their own.
export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  sun: [],
  mon: [],
  tue: [{ start: "09:00", end: "18:00" }],
  wed: [{ start: "09:00", end: "18:00" }],
  thu: [{ start: "09:00", end: "18:00" }],
  fri: [{ start: "09:00", end: "18:00" }],
  sat: [{ start: "09:00", end: "17:00" }],
};
