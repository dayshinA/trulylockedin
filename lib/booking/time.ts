import { TZDate } from "@date-fns/tz";

import {
  WEEKDAYS,
  type LocalDate,
  type LocalTime,
  type Weekday,
} from "@/types/booking";

export const MINUTE_MS = 60_000;

type DateParts = { year: number; month: number; day: number };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

// Strict: rejects "2026-02-30", "2026-1-5", etc.
export function parseLocalDate(date: LocalDate): DateParts | null {
  const match = DATE_RE.exec(date);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

// Minutes since local midnight; "24:00" → 1440 (only meaningful as a window end).
export function parseLocalTime(time: LocalTime): number | null {
  const match = TIME_RE.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;
  if (hours > 24 || (hours === 24 && minutes !== 0)) return null;
  return hours * 60 + minutes;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Salon-local date + wall-clock time → UTC epoch ms. Nonexistent times in the
// spring-forward gap shift forward (TZDate behaviour); salon hours never fall there.
export function localToUtcMs(
  date: LocalDate,
  time: LocalTime,
  timeZone: string,
): number | null {
  const parts = parseLocalDate(date);
  const minutes = parseLocalTime(time);
  if (!parts || minutes === null) return null;
  const ms = new TZDate(
    parts.year,
    parts.month - 1,
    parts.day,
    Math.floor(minutes / 60),
    minutes % 60,
    timeZone,
  ).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function utcMsToLocal(
  ms: number,
  timeZone: string,
): { date: LocalDate; time: LocalTime } {
  const local = new TZDate(ms, timeZone);
  return {
    date: `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
    time: `${pad(local.getHours())}:${pad(local.getMinutes())}`,
  };
}

export function todayLocal(now: Date, timeZone: string): LocalDate {
  return utcMsToLocal(now.getTime(), timeZone).date;
}

// Calendar arithmetic on local dates; independent of time zone and DST.
export function addDays(date: LocalDate, days: number): LocalDate {
  const parts = parseLocalDate(date);
  if (!parts) throw new Error(`Invalid local date: ${date}`);
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function weekdayOf(date: LocalDate): Weekday {
  const parts = parseLocalDate(date);
  if (!parts) throw new Error(`Invalid local date: ${date}`);
  return WEEKDAYS[
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  ];
}
