import { CURRENCY, LOCALE, TIMEZONE } from "@/lib/site";

const wholePounds = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});
const withPence = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

// Prices are stored in pence to avoid floating-point drift.
// "£65" for whole pounds, "£45.50" otherwise (never rounded).
export function formatPrice(pence: number) {
  return (pence % 100 === 0 ? wholePounds : withPence).format(pence / 100);
}

export function formatDate(date: Date, timeZone = TIMEZONE) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

export function formatTime(date: Date, timeZone = TIMEZONE) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

// Salon-local "yyyy-mm-dd" for display. Built at UTC noon and formatted in UTC,
// so the calendar day never shifts with the viewer's or server's time zone.
export function formatLocalDate(
  date: string,
  style: "chip" | "short" | "long" = "short",
) {
  const [year, month, day] = date.split("-").map(Number);
  const options: Intl.DateTimeFormatOptions =
    style === "chip"
      ? { weekday: "short", day: "numeric", month: "short" }
      : style === "short"
        ? { weekday: "short", day: "numeric", month: "short", year: "numeric" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(LOCALE, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return "Time varies";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatPriceFrom(pence: number) {
  return pence === 0 ? "Free" : `From ${formatPrice(pence)}`;
}

// What an option adds to the base price.
export function formatOptionPrice(pence: number) {
  return pence === 0 ? "No extra cost" : `+${formatPrice(pence)}`;
}

// "yyyy-mm" → "November 2026".
export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, 15)));
}
