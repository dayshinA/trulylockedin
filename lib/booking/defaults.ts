import { TIMEZONE } from "@/lib/site";
import type {
  BookingSettings,
  WeeklyHours,
  WeeklySchedule,
} from "@/types/booking";

// Starting values for settings/main; the owner changes them in the CMS.
export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  timezone: TIMEZONE,
  slotIntervalMin: 60,
  chairs: 2,
  staggerMin: 30,
  bufferMin: 15,
  minNoticeHours: 24,
  maxAdvanceDays: 30,
  depositPence: 3000,
  premiumFrom: "21:00",
};

// The salon's hours (client, 2026-11-06): Wed–Sat 13:00 to 03:00 the next
// morning. Sunday has 1 chair; its hours are the owner's to set.
export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  sun: [],
  mon: [],
  tue: [],
  wed: [{ start: "13:00", end: "03:00" }],
  thu: [{ start: "13:00", end: "03:00" }],
  fri: [{ start: "13:00", end: "03:00" }],
  sat: [{ start: "13:00", end: "03:00" }],
};

export const DEFAULT_DAY_RULES: WeeklySchedule["rules"] = {
  sun: { chairs: 1 },
};
